import type {
  CookieSummary,
  CspDirective,
  SecurityCategory,
  SecurityHeader,
  SecurityIssue,
  SecuritySeverity,
  TlsSummary,
} from "../model/types";

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
}: SecurityInput): SecurityAnalysis {
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
      "Page is served without HTTPS",
      `Final URL: ${url}`,
      "Anyone on the network path can read or modify the page and its cookies.",
      "Serve the site over HTTPS and redirect HTTP requests to it.",
      [REFS.tls],
    );
  if (tls?.protocol && /^TLSv1(\.1)?$/.test(tls.protocol))
    add(
      "transport-old-tls",
      "Transport",
      "high",
      `Outdated protocol ${tls.protocol} was negotiated`,
      `Negotiated ${tls.protocol} with ${tls.cipher ?? "an unknown cipher"}.`,
      "TLS 1.0 and 1.1 are deprecated and lack modern protections.",
      "Disable TLS 1.0 and 1.1; offer TLS 1.2 and 1.3 only.",
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
        `Certificate expires in ${days} day${days === 1 ? "" : "s"}`,
        `Valid until ${tls?.certificate?.validTo}, issued by ${tls?.certificate?.issuer ?? "an unknown issuer"}.`,
        "An expired certificate makes browsers block the site.",
        "Confirm automatic renewal is working, or renew the certificate now.",
        [REFS.tls],
      );
  }
  const hsts = headers["strict-transport-security"];
  if (https && !hsts)
    add(
      "headers-hsts-missing",
      "Transport",
      "medium",
      "HSTS is not configured",
      "No Strict-Transport-Security header in the response.",
      "A first visit or a typed http:// address can be intercepted before the redirect to HTTPS.",
      "Send Strict-Transport-Security with max-age of at least one year once every subdomain you include supports HTTPS.",
      [REFS.hsts],
    );
  if (hsts) {
    const maxAge = Number(hsts.match(/max-age\s*=\s*"?(\d+)/i)?.[1] ?? 0);
    if (maxAge < 15_552_000)
      add(
        "headers-hsts-short",
        "Transport",
        "low",
        "HSTS max-age is shorter than 180 days",
        `Strict-Transport-Security: ${hsts}`,
        "A short max-age lets the HTTPS-only policy lapse between visits.",
        "Use max-age=31536000 (one year) or longer.",
        [REFS.hsts],
      );
    if (!/includesubdomains/i.test(hsts))
      add(
        "headers-hsts-subdomains",
        "Transport",
        "info",
        "HSTS does not cover subdomains",
        `Strict-Transport-Security: ${hsts}`,
        "Subdomains can still be reached over HTTP and can set cookies for the parent domain.",
        "Add includeSubDomains after confirming every subdomain serves HTTPS.",
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
      reportOnly
        ? "Content Security Policy is report-only"
        : "Content Security Policy is not set",
      reportOnly
        ? `Content-Security-Policy-Report-Only: ${reportOnly}`
        : "No Content-Security-Policy header in the response.",
      "Without an enforced policy, injected markup can load and run any script.",
      reportOnly
        ? "Review the reports, then send the policy as Content-Security-Policy."
        : "Start with a report-only policy that restricts script sources, then enforce it.",
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
        "Policy does not restrict scripts",
        "Neither script-src nor default-src is set.",
        "Scripts can load from any origin despite the policy.",
        "Add script-src with nonces or hashes, or at least explicit trusted origins.",
        [REFS.cspSheet],
      );
    if (scripts?.includes("'unsafe-inline'") && !strict)
      add(
        "csp-unsafe-inline",
        "Content Security Policy",
        "medium",
        `${label} allows 'unsafe-inline'`,
        `${label} ${scripts.join(" ")}`,
        "Inline script injection is not blocked, which removes most of the XSS protection a policy provides.",
        "Use nonces or hashes for inline scripts and remove 'unsafe-inline'.",
        [REFS.cspSheet],
      );
    if (scripts?.includes("'unsafe-eval'"))
      add(
        "csp-unsafe-eval",
        "Content Security Policy",
        "medium",
        `${label} allows 'unsafe-eval'`,
        `${label} ${scripts.join(" ")}`,
        "eval-style string execution stays available to injected code.",
        "Remove 'unsafe-eval' and replace code that needs it.",
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
        `${label} allows broad sources`,
        `${label} includes ${broad.join(", ")}`,
        "Scripts can be loaded from almost any host, which an attacker can satisfy.",
        "List specific origins, or use nonces with 'strict-dynamic'.",
        [REFS.cspSheet],
      );
    const objects = directive("object-src") ?? directive("default-src");
    if (!objects?.includes("'none'"))
      add(
        "csp-object-src",
        "Content Security Policy",
        "low",
        "Plugins are not disabled",
        objects
          ? `${directive("object-src") ? "object-src" : "default-src"} ${objects.join(" ")}`
          : "object-src is not set.",
        "Plugin content can bypass script restrictions in older browsers.",
        "Add object-src 'none'.",
        [REFS.cspSheet],
      );
    if (!directive("base-uri"))
      add(
        "csp-base-uri",
        "Content Security Policy",
        "low",
        "base-uri is not restricted",
        "base-uri is not set (it does not fall back to default-src).",
        "Injected <base> tags can redirect relative script URLs to another host.",
        "Add base-uri 'self' or 'none'.",
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
      "Page can be framed by any site",
      "Neither CSP frame-ancestors nor X-Frame-Options is set.",
      "Other sites can embed the page invisibly and trick users into clicking it (clickjacking).",
      "Set frame-ancestors 'self' (or the origins allowed to embed the page).",
      [REFS.framing],
    );
  if (headers["x-content-type-options"]?.toLowerCase() !== "nosniff")
    add(
      "headers-nosniff",
      "Headers",
      "low",
      "MIME type sniffing is not disabled",
      headers["x-content-type-options"]
        ? `X-Content-Type-Options: ${headers["x-content-type-options"]}`
        : "No X-Content-Type-Options header.",
      "Browsers may execute responses as a different type than declared.",
      "Send X-Content-Type-Options: nosniff.",
      [REFS.nosniff],
    );
  const referrer = headers["referrer-policy"];
  if (referrer && /unsafe-url|no-referrer-when-downgrade/i.test(referrer))
    add(
      "headers-referrer-leaky",
      "Headers",
      "low",
      "Referrer policy sends full URLs to other sites",
      `Referrer-Policy: ${referrer}`,
      "Paths and query strings, which may contain identifiers, leak to third parties.",
      "Use strict-origin-when-cross-origin or stricter.",
      [REFS.referrer],
    );
  if (!referrer)
    add(
      "headers-referrer-missing",
      "Headers",
      "info",
      "Referrer-Policy is not set",
      "No Referrer-Policy header; the browser default applies.",
      "Modern browsers default to strict-origin-when-cross-origin, but older ones may send full URLs.",
      "Send Referrer-Policy: strict-origin-when-cross-origin explicitly.",
      [REFS.referrer],
    );
  if (!headers["permissions-policy"])
    add(
      "headers-permissions",
      "Headers",
      "info",
      "Permissions-Policy is not set",
      "No Permissions-Policy header.",
      "Embedded or injected content can request powerful features such as camera or geolocation.",
      "Disable features the site does not use, for example camera=(), microphone=(), geolocation=().",
      [REFS.permissions],
    );
  if (!headers["cross-origin-opener-policy"])
    add(
      "headers-coop",
      "Headers",
      "info",
      "Cross-Origin-Opener-Policy is not set",
      "No Cross-Origin-Opener-Policy header.",
      "Pages opened from other origins keep a reference to this window, which enables some cross-site leaks.",
      "Send Cross-Origin-Opener-Policy: same-origin unless the site relies on cross-origin popups.",
      [REFS.coop],
    );
  const xss = headers["x-xss-protection"];
  if (xss && !/^\s*0\s*$/.test(xss))
    add(
      "headers-xss-filter",
      "Headers",
      "info",
      "Deprecated XSS filter is enabled",
      `X-XSS-Protection: ${xss}`,
      "The legacy filter has been removed from modern browsers and could introduce issues in old ones.",
      "Remove the header or set it to 0, and rely on Content-Security-Policy.",
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
      "CORS allows any origin with credentials",
      "Access-Control-Allow-Origin: * with Access-Control-Allow-Credentials: true",
      "This combination signals an intent to share credentialed responses with any site; browsers reject it, but it often hides a reflective configuration elsewhere.",
      "Allow only specific trusted origins when credentials are required.",
      [REFS.cors],
    );
  else if (origin === "*")
    add(
      "headers-cors-wildcard",
      "Headers",
      "low",
      "Page is readable by any origin",
      "Access-Control-Allow-Origin: *",
      "Any website can read this response with a script. This is only a problem if it contains non-public data.",
      "Remove the header from HTML pages, or restrict it to trusted origins.",
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
      `${name} reveals software${/\d/.test(value) ? " and version" : ""}`,
      `${name}: ${value}`,
      "Version details help attackers match the server to known vulnerabilities.",
      `Remove ${name} or strip the version from it.`,
      [REFS.headers],
    );

  // Cookies
  const cookies = setCookies.map(parseCookie);
  for (const cookie of cookies) {
    const label = `Cookie ${cookie.name}`;
    const attributes = [
      cookie.secure && "Secure",
      cookie.httpOnly && "HttpOnly",
      cookie.sameSite && `SameSite=${cookie.sameSite}`,
    ]
      .filter(Boolean)
      .join("; ");
    const evidence = `${cookie.name}: ${attributes || "no security attributes"}`;
    if (https && !cookie.secure)
      add(
        `cookie-secure-${cookie.name}`,
        "Cookies",
        "medium",
        `${label} is sent over plain HTTP`,
        evidence,
        "Without Secure, the cookie is also sent on any HTTP request to the domain, where it can be intercepted.",
        "Add the Secure attribute.",
        [REFS.cookies, REFS.sessions],
      );
    if (cookie.sameSite?.toLowerCase() === "none" && !cookie.secure)
      add(
        `cookie-samesite-none-${cookie.name}`,
        "Cookies",
        "medium",
        `${label} uses SameSite=None without Secure`,
        evidence,
        "Browsers reject this combination, so the cookie may not be set at all.",
        "Add Secure, or use SameSite=Lax.",
        [REFS.cookies],
      );
    if (!cookie.sameSite)
      add(
        `cookie-samesite-${cookie.name}`,
        "Cookies",
        "low",
        `${label} has no SameSite attribute`,
        evidence,
        "Browsers apply different defaults; older ones send it on cross-site requests, which enables CSRF.",
        "Set SameSite=Lax (or Strict) explicitly.",
        [REFS.cookies, REFS.sessions],
      );
    if (!cookie.httpOnly)
      add(
        `cookie-httponly-${cookie.name}`,
        "Cookies",
        "info",
        `${label} is readable by scripts`,
        evidence,
        "If this cookie identifies a session, injected scripts could read it.",
        "Add HttpOnly unless page scripts need the value.",
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
        `${label} breaks the __Host- prefix rules`,
        evidence,
        "Browsers reject __Host- cookies unless they are Secure, host-only, and Path=/.",
        "Set Secure and Path=/ and remove Domain.",
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
