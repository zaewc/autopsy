import type { SecurityIssue, ThirdPartyScript } from "../model/types";
import { tags, withoutComments } from "./markup";

export interface ContentInput {
  /** Final page URL. */
  url: string;
  /** Rendered DOM when available, otherwise the HTML response. */
  html: string;
  /** Requests the browser made, when a browser stage ran. */
  requests?: readonly { url: string; type: string }[];
}

export interface ContentAnalysis {
  issues: SecurityIssue[];
  thirdPartyScripts: ThirdPartyScript[];
}

const MDN = "https://developer.mozilla.org/en-US/docs/";
const MIXED = {
  label: "MDN: Mixed content",
  url: `${MDN}Web/Security/Mixed_content`,
};
const SRI = {
  label: "MDN: Subresource Integrity",
  url: `${MDN}Web/Security/Subresource_Integrity`,
};
const FORMS = {
  label: "OWASP: Transport Layer Security",
  url: "https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html",
};
// Types a browser executes or applies; mixed versions of these are blocked.
const ACTIVE = new Set([
  "script",
  "stylesheet",
  "fetch",
  "xhr",
  "websocket",
  "eventsource",
  "document",
]);

/** Last two labels, as a rough same-site test without a public suffix list. */
function site(hostname: string) {
  return hostname.split(".").slice(-2).join(".");
}

function list(urls: readonly string[]) {
  const shown = urls.slice(0, 5).join(", ");
  return urls.length > 5 ? `${shown}, and ${urls.length - 5} more` : shown;
}

/**
 * Passive review of what the page loads: mixed content, third-party scripts
 * without Subresource Integrity, and forms that submit over HTTP.
 */
export function analyzeContent({
  url,
  html,
  requests,
}: ContentInput): ContentAnalysis {
  const issues: SecurityIssue[] = [];
  const page = new URL(url);
  const markup = withoutComments(html);
  const resolve = (value: string) => {
    try {
      return new URL(value, page);
    } catch {
      return null;
    }
  };

  if (page.protocol === "https:") {
    const insecure = requests
      ? requests
          .filter((request) => request.url.startsWith("http:"))
          .map((request) => ({
            url: request.url,
            active: ACTIVE.has(request.type),
          }))
      : [
          ...tags(markup, "script").map((script) => ({
            value: script.src,
            active: true,
          })),
          ...tags(markup, "iframe").map((frame) => ({
            value: frame.src,
            active: true,
          })),
          ...tags(markup, "link")
            .filter((link) => /stylesheet/i.test(link.rel ?? ""))
            .map((link) => ({ value: link.href, active: true })),
          ...tags(markup, "img").map((image) => ({
            value: image.src,
            active: false,
          })),
        ]
          .filter(({ value }) => value && /^http:/i.test(value))
          .map(({ value, active }) => ({ url: value, active }));
    const active = insecure
      .filter((entry) => entry.active)
      .map((entry) => entry.url);
    const passive = insecure
      .filter((entry) => !entry.active)
      .map((entry) => entry.url);
    const where = requests ? "requested by the page" : "referenced in the HTML";
    if (active.length)
      issues.push({
        id: "content-mixed-active",
        category: "Content",
        severity: "high",
        title: `${active.length} script or data resource${active.length === 1 ? "" : "s"} over HTTP`,
        evidence: `HTTP URLs ${where}: ${list(active)}`,
        impact:
          "Browsers block these on an HTTPS page, breaking features; where allowed, a network attacker could replace them and run code in the page.",
        fix: "Load these resources over HTTPS, or add upgrade-insecure-requests to the Content Security Policy.",
        references: [MIXED],
      });
    if (passive.length)
      issues.push({
        id: "content-mixed-passive",
        category: "Content",
        severity: "low",
        title: `${passive.length} image or media resource${passive.length === 1 ? "" : "s"} over HTTP`,
        evidence: `HTTP URLs ${where}: ${list(passive)}`,
        impact:
          "Browsers upgrade or block these; a network attacker could otherwise swap the content shown.",
        fix: "Serve these resources over HTTPS.",
        references: [MIXED],
      });
  }

  const origins = new Map<
    string,
    { count: number; withIntegrity: number; urls: string[] }
  >();
  for (const script of tags(markup, "script")) {
    const source = script.src && resolve(script.src);
    if (!source || site(source.hostname) === site(page.hostname)) continue;
    const entry = origins.get(source.origin) ?? {
      count: 0,
      withIntegrity: 0,
      urls: [],
    };
    entry.count += 1;
    if (script.integrity) entry.withIntegrity += 1;
    else entry.urls.push(source.href);
    origins.set(source.origin, entry);
  }
  const thirdPartyScripts = [...origins]
    .map(([origin, { count, withIntegrity }]) => ({
      origin,
      count,
      withIntegrity,
    }))
    .sort((a, b) => b.count - a.count);
  const unprotected = [...origins.values()].flatMap(({ urls }) => urls);
  if (unprotected.length)
    issues.push({
      id: "content-sri",
      category: "Content",
      severity: "low",
      title: `${unprotected.length} third-party script${unprotected.length === 1 ? " has" : "s have"} no integrity check`,
      evidence: `Script tags without an integrity attribute: ${list(unprotected)}`,
      impact:
        "If one of these hosts is compromised, the modified script runs with full access to the page. Scripts that change on every release, such as tag managers, cannot use integrity hashes.",
      fix: "Add integrity and crossorigin attributes to versioned third-party scripts, or self-host them.",
      references: [SRI],
    });

  const insecureForms = tags(markup, "form").flatMap((form) => {
    const action = form.action ? resolve(form.action) : null;
    return action?.protocol === "http:" ? [action.href] : [];
  });
  if (insecureForms.length)
    issues.push({
      id: "content-form-http",
      category: "Content",
      severity: "medium",
      title: `${insecureForms.length} form${insecureForms.length === 1 ? " submits" : "s submit"} over HTTP`,
      evidence: `Form actions: ${list(insecureForms)}`,
      impact: "Submitted data, including any credentials, travels unencrypted.",
      fix: "Point form actions at HTTPS URLs.",
      references: [FORMS],
    });

  return { issues, thirdPartyScripts };
}
