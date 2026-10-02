import type { Locale, Localized } from "@/shared/lib/i18n";
import type { SecurityIssue, ThirdPartyScript } from "../model/types";
import { tags, withoutComments } from "./markup";

export interface ContentInput {
  /** Final page URL. */
  url: string;
  /** Rendered DOM when available, otherwise the HTML response. */
  html: string;
  /** Requests the browser made, when a browser stage ran. */
  requests?: readonly { url: string; type: string }[];
  locale?: Locale;
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

const en = {
  more: (shown: string, more: number) => `${shown}, and ${more} more`,
  requested: "requested by the page",
  referenced: "referenced in the HTML",
  urls: (where: string, list: string) => `HTTP URLs ${where}: ${list}`,
  active: {
    title: (count: number) =>
      `${count} script or data resource${count === 1 ? "" : "s"} over HTTP`,
    impact:
      "Browsers block these on an HTTPS page, breaking features; where allowed, a network attacker could replace them and run code in the page.",
    fix: "Load these resources over HTTPS, or add upgrade-insecure-requests to the Content Security Policy.",
  },
  passive: {
    title: (count: number) =>
      `${count} image or media resource${count === 1 ? "" : "s"} over HTTP`,
    impact:
      "Browsers upgrade or block these; a network attacker could otherwise swap the content shown.",
    fix: "Serve these resources over HTTPS.",
  },
  sri: {
    title: (count: number) =>
      `${count} third-party script${count === 1 ? " has" : "s have"} no integrity check`,
    evidence: (list: string) =>
      `Script tags without an integrity attribute: ${list}`,
    impact:
      "If one of these hosts is compromised, the modified script runs with full access to the page. Scripts that change on every release, such as tag managers, cannot use integrity hashes.",
    fix: "Add integrity and crossorigin attributes to versioned third-party scripts, or self-host them.",
  },
  forms: {
    title: (count: number) =>
      `${count} form${count === 1 ? " submits" : "s submit"} over HTTP`,
    evidence: (list: string) => `Form actions: ${list}`,
    impact: "Submitted data, including any credentials, travels unencrypted.",
    fix: "Point form actions at HTTPS URLs.",
  },
};
const MESSAGES: Localized<typeof en> = {
  en,
  ko: {
    more: (shown, more) => `${shown} 외 ${more}개`,
    requested: "페이지가 요청한",
    referenced: "HTML이 참조하는",
    urls: (where, list) => `${where} HTTP URL: ${list}`,
    active: {
      title: (count) => `HTTP로 불러오는 스크립트·데이터 리소스 ${count}개`,
      impact:
        "HTTPS 페이지에서는 브라우저가 이를 차단해 기능이 깨집니다. 허용되는 경우 네트워크 공격자가 리소스를 바꿔 페이지에서 코드를 실행할 수 있습니다.",
      fix: "이 리소스를 HTTPS로 불러오거나 Content Security Policy에 upgrade-insecure-requests를 추가하세요.",
    },
    passive: {
      title: (count) => `HTTP로 불러오는 이미지·미디어 리소스 ${count}개`,
      impact:
        "브라우저가 이를 업그레이드하거나 차단합니다. 그렇지 않으면 네트워크 공격자가 보이는 콘텐츠를 바꿀 수 있습니다.",
      fix: "이 리소스를 HTTPS로 제공하세요.",
    },
    sri: {
      title: (count) => `integrity 검사가 없는 서드파티 스크립트 ${count}개`,
      evidence: (list) => `integrity 속성이 없는 script 태그: ${list}`,
      impact:
        "이 호스트 중 하나가 침해되면 변조된 스크립트가 페이지 전체에 접근한 채 실행됩니다. tag manager처럼 배포마다 바뀌는 스크립트에는 integrity hash를 쓸 수 없습니다.",
      fix: "버전이 고정된 서드파티 스크립트에 integrity와 crossorigin 속성을 추가하거나 직접 호스팅하세요.",
    },
    forms: {
      title: (count) => `HTTP로 제출되는 form ${count}개`,
      evidence: (list) => `form action: ${list}`,
      impact:
        "인증 정보를 포함해 제출되는 데이터가 암호화되지 않은 채 전송됩니다.",
      fix: "form action을 HTTPS URL로 지정하세요.",
    },
  },
};

/** Last two labels, as a rough same-site test without a public suffix list. */
function site(hostname: string) {
  return hostname.split(".").slice(-2).join(".");
}

function list(urls: readonly string[], t: typeof en) {
  const shown = urls.slice(0, 5).join(", ");
  return urls.length > 5 ? t.more(shown, urls.length - 5) : shown;
}

/**
 * Passive review of what the page loads: mixed content, third-party scripts
 * without Subresource Integrity, and forms that submit over HTTP.
 */
export function analyzeContent({
  url,
  html,
  requests,
  locale = "en",
}: ContentInput): ContentAnalysis {
  const t = MESSAGES[locale];
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
    const where = requests ? t.requested : t.referenced;
    if (active.length)
      issues.push({
        id: "content-mixed-active",
        category: "Content",
        severity: "high",
        title: t.active.title(active.length),
        evidence: t.urls(where, list(active, t)),
        impact: t.active.impact,
        fix: t.active.fix,
        references: [MIXED],
      });
    if (passive.length)
      issues.push({
        id: "content-mixed-passive",
        category: "Content",
        severity: "low",
        title: t.passive.title(passive.length),
        evidence: t.urls(where, list(passive, t)),
        impact: t.passive.impact,
        fix: t.passive.fix,
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
      title: t.sri.title(unprotected.length),
      evidence: t.sri.evidence(list(unprotected, t)),
      impact: t.sri.impact,
      fix: t.sri.fix,
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
      title: t.forms.title(insecureForms.length),
      evidence: t.forms.evidence(list(insecureForms, t)),
      impact: t.forms.impact,
      fix: t.forms.fix,
      references: [FORMS],
    });

  return { issues, thirdPartyScripts };
}
