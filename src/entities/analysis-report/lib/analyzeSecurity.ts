import type { Locale } from "@/shared/lib/i18n";
import type {
  CookieSummary,
  CspDirective,
  SecurityCategory,
  SecurityHeader,
  SecurityIssue,
  SecuritySeverity,
  TlsSummary,
} from "../model/types";
import { SECURITY_TEXT } from "./securityText";

export interface SecurityInput {
  /** Final URL after redirects. */
  url: string;
  /** Lower-cased response headers. */
  headers: Readonly<Record<string, string>>;
  /** Individual Set-Cookie headers; values are read only to drop them. */
  setCookies: readonly string[];
  tls: TlsSummary | null;
  /** Reference time for certificate expiry. */
  now?: Date;
  locale?: Locale;
}

export interface SecurityAnalysis {
  issues: SecurityIssue[];
  headers: SecurityHeader[];
  csp: { reportOnly: boolean; directives: CspDirective[] } | null;
  cookies: CookieSummary[];
  tls: TlsSummary | null;
}

const MDN =
  "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/";
const OWASP = "https://cheatsheetseries.owasp.org/cheatsheets/";
const ref = (label: string, url: string) => ({ label, url });
const REFS = {
  hsts: ref(
    "MDN: Strict-Transport-Security",
    `${MDN}Strict-Transport-Security`,
  ),
  csp: ref("MDN: Content-Security-Policy", `${MDN}Content-Security-Policy`),
  cspSheet: ref(
    "OWASP: Content Security Policy",
    `${OWASP}Content_Security_Policy_Cheat_Sheet.html`,
  ),
  framing: ref(
    "OWASP: Clickjacking defense",
    `${OWASP}Clickjacking_Defense_Cheat_Sheet.html`,
  ),
  nosniff: ref("MDN: X-Content-Type-Options", `${MDN}X-Content-Type-Options`),
  referrer: ref("MDN: Referrer-Policy", `${MDN}Referrer-Policy`),
  permissions: ref("MDN: Permissions-Policy", `${MDN}Permissions-Policy`),
  coop: ref(
    "MDN: Cross-Origin-Opener-Policy",
    `${MDN}Cross-Origin-Opener-Policy`,
  ),
  xss: ref("MDN: X-XSS-Protection", `${MDN}X-XSS-Protection`),
  cors: ref(
    "MDN: Access-Control-Allow-Origin",
    `${MDN}Access-Control-Allow-Origin`,
  ),
  cookies: ref("MDN: Set-Cookie", `${MDN}Set-Cookie`),
  sessions: ref(
    "OWASP: Session management",
    `${OWASP}Session_Management_Cheat_Sheet.html`,
  ),
  headers: ref("OWASP: HTTP headers", `${OWASP}HTTP_Headers_Cheat_Sheet.html`),
  tls: ref(
    "OWASP: Transport Layer Security",
    `${OWASP}Transport_Layer_Security_Cheat_Sheet.html`,
  ),
};

const SECURITY_HEADERS = [
  "strict-transport-security",
  "content-security-policy",
  "content-security-policy-report-only",
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
  "cross-origin-opener-policy",
  "cross-origin-resource-policy",
  "cross-origin-embedder-policy",
  "access-control-allow-origin",
  "x-xss-protection",
] as const;

const DAY = 86_400_000;

function parseCsp(value: string): CspDirective[] {
  return value
    .split(";")
    .map((part) => part.trim().split(/\s+/).filter(Boolean))
    .filter((tokens) => tokens.length > 0)
    .map(([name, ...values]) => ({ name: name.toLowerCase(), values }));
}

function parseCookie(header: string): CookieSummary {
  const [pair, ...attributes] = header.split(";").map((part) => part.trim());
  const name = pair.split("=")[0].trim();
  const flags = new Map(
    attributes.map((attribute) => {
      const [key, ...rest] = attribute.split("=");
      return [key.trim().toLowerCase(), rest.join("=").trim()] as const;
    }),
  );
  return {
    name,
    secure: flags.has("secure"),
    httpOnly: flags.has("httponly"),
    sameSite: flags.get("samesite") || null,
    domain: flags.get("domain") || null,
    path: flags.get("path") || null,
    persistent: flags.has("expires") || flags.has("max-age"),
  };
}

/**
 * Passive security review of one HTTPS response: transport, security headers,
 * Content Security Policy, cookies, and information disclosure. Each issue is
 * a configuration weakness with evidence, not a confirmed exploit.
 */
export function analyzeSecurity({
  url,
  headers,
  setCookies,
  tls,
  now = new Date(),
  locale = "en",
}: SecurityInput): SecurityAnalysis {
  const t = SECURITY_TEXT[locale];
  const issues: SecurityIssue[] = [];
  const add = (
    id: string,
    category: SecurityCategory,
    severity: SecuritySeverity,
    title: string,
    evidence: string,
    impact: string,
    fix: string,
    references: SecurityIssue["references"],
  ) =>
    issues.push({
      id,
      category,
      severity,
      title,
      evidence,
      impact,
      fix,
      references,
    });
  const https = url.startsWith("https:");

  // Transport
  if (!https)
    add(
      "transport-http",
      "Transport",
      "high",
      t.http.title,
      t.http.evidence(url),
      t.http.impact,
      t.http.fix,
      [REFS.tls],
    );
  if (tls?.protocol && /^TLSv1(\.1)?$/.test(tls.protocol))
    add(
      "transport-old-tls",
      "Transport",
      "high",
      t.oldTls.title(tls.protocol),
      t.oldTls.evidence(tls.protocol, tls.cipher ?? t.unknownCipher),
      t.oldTls.impact,
      t.oldTls.fix,
      [REFS.tls],
    );
  const expiry = tls?.certificate?.validTo
    ? Date.parse(tls.certificate.validTo)
    : NaN;
  if (!Number.isNaN(expiry)) {
    const days = Math.floor((expiry - now.getTime()) / DAY);
    if (days < 30)
      add(
        "transport-certificate-expiry",
        "Transport",
        days < 14 ? "medium" : "low",
        t.expiry.title(days),
        t.expiry.evidence(
          tls?.certificate?.validTo ?? "",
          tls?.certificate?.issuer ?? t.unknownIssuer,
        ),
        t.expiry.impact,
        t.expiry.fix,
        [REFS.tls],
      );
  }
  const hsts = headers["strict-transport-security"];
  if (https && !hsts)
    add(
      "headers-hsts-missing",
      "Transport",
      "medium",
      t.hstsMissing.title,
      t.hstsMissing.evidence,
      t.hstsMissing.impact,
      t.hstsMissing.fix,
      [REFS.hsts],
    );
  if (hsts) {
    const maxAge = Number(hsts.match(/max-age\s*=\s*"?(\d+)/i)?.[1] ?? 0);
    if (maxAge < 15_552_000)
      add(
        "headers-hsts-short",
        "Transport",
        "low",
        t.hstsShort.title,
        `Strict-Transport-Security: ${hsts}`,
        t.hstsShort.impact,
        t.hstsShort.fix,
        [REFS.hsts],
      );
    if (!/includesubdomains/i.test(hsts))
      add(
        "headers-hsts-subdomains",
        "Transport",
        "info",
        t.hstsSubdomains.title,
        `Strict-Transport-Security: ${hsts}`,
        t.hstsSubdomains.impact,
        t.hstsSubdomains.fix,
        [REFS.hsts],
      );
  }

  // Content Security Policy
  const enforced = headers["content-security-policy"];
  const reportOnly = headers["content-security-policy-report-only"];
  const policy = enforced ?? reportOnly;
  const directives = policy ? parseCsp(policy) : [];
  if (!enforced)
    add(
      "csp-missing",
      "Content Security Policy",
      reportOnly ? "low" : "medium",
      reportOnly ? t.cspReportOnly.title : t.cspMissing.title,
      reportOnly
        ? `Content-Security-Policy-Report-Only: ${reportOnly}`
        : t.cspMissing.evidence,
      t.cspImpact,
      reportOnly ? t.cspReportOnly.fix : t.cspMissing.fix,
      [REFS.csp, REFS.cspSheet],
    );
  if (policy) {
    const directive = (name: string) =>
      directives.find((entry) => entry.name === name)?.values;
    const scripts = directive("script-src") ?? directive("default-src");
    const label = directive("script-src") ? "script-src" : "default-src";
    const strict =
      scripts?.some((value) =>
        /^'(nonce-|sha(256|384|512)-|strict-dynamic')/.test(value),
      ) ?? false;
    if (!scripts)
      add(
        "csp-no-script-src",
        "Content Security Policy",
        "medium",
        t.cspNoScript.title,
        t.cspNoScript.evidence,
        t.cspNoScript.impact,
        t.cspNoScript.fix,
        [REFS.cspSheet],
      );
    if (scripts?.includes("'unsafe-inline'") && !strict)
      add(
        "csp-unsafe-inline",
        "Content Security Policy",
        "medium",
        t.unsafeInline.title(label),
        `${label} ${scripts.join(" ")}`,
        t.unsafeInline.impact,
        t.unsafeInline.fix,
        [REFS.cspSheet],
      );
    if (scripts?.includes("'unsafe-eval'"))
      add(
        "csp-unsafe-eval",
        "Content Security Policy",
        "medium",
        t.unsafeEval.title(label),
        `${label} ${scripts.join(" ")}`,
        t.unsafeEval.impact,
        t.unsafeEval.fix,
        [REFS.cspSheet],
      );
    const broad = scripts?.filter((value) =>
      ["*", "http:", "https:", "data:", "blob:"].includes(value),
    );
    if (broad?.length && !strict)
      add(
        "csp-broad-sources",
        "Content Security Policy",
        "medium",
        t.broad.title(label),
        t.broad.evidence(label, broad.join(", ")),
        t.broad.impact,
        t.broad.fix,
        [REFS.cspSheet],
      );
    const objects = directive("object-src") ?? directive("default-src");
    if (!objects?.includes("'none'"))
      add(
        "csp-object-src",
        "Content Security Policy",
        "low",
        t.objectSrc.title,
        objects
          ? `${directive("object-src") ? "object-src" : "default-src"} ${objects.join(" ")}`
          : t.objectSrc.unset,
        t.objectSrc.impact,
        t.objectSrc.fix,
        [REFS.cspSheet],
      );
    if (!directive("base-uri"))
      add(
        "csp-base-uri",
        "Content Security Policy",
        "low",
        t.baseUri.title,
        t.baseUri.evidence,
        t.baseUri.impact,
        t.baseUri.fix,
        [REFS.cspSheet],
      );
  }

  // Framing and other headers
  const frameAncestors = enforced
    ? parseCsp(enforced).find(({ name }) => name === "frame-ancestors")
    : undefined;
  if (!frameAncestors && !headers["x-frame-options"])
    add(
      "headers-framing",
      "Headers",
      "medium",
      t.framing.title,
      t.framing.evidence,
      t.framing.impact,
      t.framing.fix,
      [REFS.framing],
    );
  if (headers["x-content-type-options"]?.toLowerCase() !== "nosniff")
    add(
      "headers-nosniff",
      "Headers",
      "low",
      t.nosniff.title,
      headers["x-content-type-options"]
        ? `X-Content-Type-Options: ${headers["x-content-type-options"]}`
        : t.nosniff.missing,
      t.nosniff.impact,
      t.nosniff.fix,
      [REFS.nosniff],
    );
  const referrer = headers["referrer-policy"];
  if (referrer && /unsafe-url|no-referrer-when-downgrade/i.test(referrer))
    add(
      "headers-referrer-leaky",
      "Headers",
      "low",
      t.referrerLeaky.title,
      `Referrer-Policy: ${referrer}`,
      t.referrerLeaky.impact,
      t.referrerLeaky.fix,
      [REFS.referrer],
    );
  if (!referrer)
    add(
      "headers-referrer-missing",
      "Headers",
      "info",
      t.referrerMissing.title,
      t.referrerMissing.evidence,
      t.referrerMissing.impact,
      t.referrerMissing.fix,
      [REFS.referrer],
    );
  if (!headers["permissions-policy"])
    add(
      "headers-permissions",
      "Headers",
      "info",
      t.permissions.title,
      t.permissions.evidence,
      t.permissions.impact,
      t.permissions.fix,
      [REFS.permissions],
    );
  if (!headers["cross-origin-opener-policy"])
    add(
      "headers-coop",
      "Headers",
      "info",
      t.coop.title,
      t.coop.evidence,
      t.coop.impact,
      t.coop.fix,
      [REFS.coop],
    );
  const xss = headers["x-xss-protection"];
  if (xss && !/^\s*0\s*$/.test(xss))
    add(
      "headers-xss-filter",
      "Headers",
      "info",
      t.xss.title,
      `X-XSS-Protection: ${xss}`,
      t.xss.impact,
      t.xss.fix,
      [REFS.xss],
    );
  const origin = headers["access-control-allow-origin"];
  if (
    origin === "*" &&
    /true/i.test(headers["access-control-allow-credentials"] ?? "")
  )
    add(
      "headers-cors-credentials",
      "Headers",
      "high",
      t.corsCredentials.title,
      t.corsCredentials.evidence,
      t.corsCredentials.impact,
      t.corsCredentials.fix,
      [REFS.cors],
    );
  else if (origin === "*")
    add(
      "headers-cors-wildcard",
      "Headers",
      "low",
      t.corsWildcard.title,
      "Access-Control-Allow-Origin: *",
      t.corsWildcard.impact,
      t.corsWildcard.fix,
      [REFS.cors],
    );

  // Information disclosure
  const disclosures = [
    ["server", headers.server],
    ["x-powered-by", headers["x-powered-by"]],
    ["x-aspnet-version", headers["x-aspnet-version"]],
    ["x-aspnetmvc-version", headers["x-aspnetmvc-version"]],
    ["x-generator", headers["x-generator"]],
  ].filter(
    (entry): entry is [string, string] =>
      Boolean(entry[1]) && (entry[0] !== "server" || /\d/.test(entry[1] ?? "")),
  );
  for (const [name, value] of disclosures)
    add(
      `disclosure-${name}`,
      "Disclosure",
      "low",
      t.disclosure.title(name, /\d/.test(value)),
      `${name}: ${value}`,
      t.disclosure.impact,
      t.disclosure.fix(name),
      [REFS.headers],
    );

  // Cookies
  const cookies = setCookies.map(parseCookie);
  for (const cookie of cookies) {
    const label = t.cookie.label(cookie.name);
    const attributes = [
      cookie.secure && "Secure",
      cookie.httpOnly && "HttpOnly",
      cookie.sameSite && `SameSite=${cookie.sameSite}`,
    ]
      .filter(Boolean)
      .join("; ");
    const evidence = `${cookie.name}: ${attributes || t.cookie.noAttributes}`;
    if (https && !cookie.secure)
      add(
        `cookie-secure-${cookie.name}`,
        "Cookies",
        "medium",
        t.cookie.secure.title(label),
        evidence,
        t.cookie.secure.impact,
        t.cookie.secure.fix,
        [REFS.cookies, REFS.sessions],
      );
    if (cookie.sameSite?.toLowerCase() === "none" && !cookie.secure)
      add(
        `cookie-samesite-none-${cookie.name}`,
        "Cookies",
        "medium",
        t.cookie.sameSiteNone.title(label),
        evidence,
        t.cookie.sameSiteNone.impact,
        t.cookie.sameSiteNone.fix,
        [REFS.cookies],
      );
    if (!cookie.sameSite)
      add(
        `cookie-samesite-${cookie.name}`,
        "Cookies",
        "low",
        t.cookie.sameSite.title(label),
        evidence,
        t.cookie.sameSite.impact,
        t.cookie.sameSite.fix,
        [REFS.cookies, REFS.sessions],
      );
    if (!cookie.httpOnly)
      add(
        `cookie-httponly-${cookie.name}`,
        "Cookies",
        "info",
        t.cookie.httpOnly.title(label),
        evidence,
        t.cookie.httpOnly.impact,
        t.cookie.httpOnly.fix,
        [REFS.sessions],
      );
    if (
      cookie.name.startsWith("__Host-") &&
      (!cookie.secure || cookie.domain || cookie.path !== "/")
    )
      add(
        `cookie-host-prefix-${cookie.name}`,
        "Cookies",
        "medium",
        t.cookie.hostPrefix.title(label),
        evidence,
        t.cookie.hostPrefix.impact,
        t.cookie.hostPrefix.fix,
        [REFS.cookies],
      );
  }

  const order: Record<SecuritySeverity, number> = {
    high: 0,
    medium: 1,
    low: 2,
    info: 3,
  };
  issues.sort((a, b) => order[a.severity] - order[b.severity]);
  return {
    issues,
    headers: SECURITY_HEADERS.map((name) => ({
      name,
      value: headers[name] ?? null,
    })),
    csp: policy ? { reportOnly: !enforced, directives } : null,
    cookies,
    tls,
  };
}
