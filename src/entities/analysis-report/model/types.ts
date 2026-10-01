export interface Technology {
  name: string;
  version: string;
  type: string;
  evidence: string;
  basis: "Observed" | "Inferred";
}
export interface Finding {
  severity: "warning" | "info";
  title: string;
  detail: string;
  why: string;
  fix: string;
  tag: string;
}
export type AuditArea = "Security" | "Accessibility" | "SEO";
export interface AuditCheck {
  area: AuditArea;
  name: string;
  status: "Passed" | "Review" | "Manual";
  detail: string;
}
export type SecuritySeverity = "high" | "medium" | "low" | "info";
export type SecurityCategory =
  | "Transport"
  | "Headers"
  | "Content Security Policy"
  | "Cookies"
  | "Content"
  | "Dependencies"
  | "Disclosure";
/** A passively observed weakness, with evidence and a fix. */
export interface SecurityIssue {
  id: string;
  category: SecurityCategory;
  severity: SecuritySeverity;
  title: string;
  evidence: string;
  impact: string;
  fix: string;
  references: readonly { label: string; url: string }[];
}
/** Scripts loaded from another site, grouped by origin. */
export interface ThirdPartyScript {
  origin: string;
  count: number;
  /** Script tags that carry an integrity hash. */
  withIntegrity: number;
}
/** An advisory matching a library version observed on the page. */
export interface KnownVulnerability {
  technology: string;
  packageName: string;
  version: string;
  id: string;
  aliases: readonly string[];
  summary: string | null;
  severity: SecuritySeverity;
  /** Lowest fixed version, when the advisory lists one. */
  fixed: string | null;
  url: string;
}
export interface SecurityHeader {
  name: string;
  /** Null when the response does not send it. */
  value: string | null;
}
export interface CspDirective {
  name: string;
  values: readonly string[];
}
/** Cookie name and attributes; the value is never kept. */
export interface CookieSummary {
  name: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string | null;
  domain: string | null;
  path: string | null;
  persistent: boolean;
}
export interface TlsSummary {
  protocol: string | null;
  cipher: string | null;
  authorized: boolean;
  certificate: {
    subject: string | null;
    issuer: string | null;
    names: readonly string[];
    validFrom: string | null;
    validTo: string | null;
  } | null;
}

export interface SecurityTxt {
  url: string;
  contact: readonly string[];
  expires: string | null;
  expired: boolean;
  policy: string | null;
}
/** Passive security review of a live scan. */
export interface SecurityReport {
  /** Sorted by severity, highest first. */
  issues: readonly SecurityIssue[];
  headers: readonly SecurityHeader[];
  csp: { reportOnly: boolean; directives: readonly CspDirective[] } | null;
  cookies: readonly CookieSummary[];
  tls: TlsSummary | null;
  thirdPartyScripts: readonly ThirdPartyScript[];
  vulnerabilities: readonly KnownVulnerability[];
  dependencyCheck: {
    /** package@version pairs looked up in OSV.dev. */
    checked: readonly string[];
    status: "checked" | "unavailable" | "none";
  };
  securityTxt: SecurityTxt | null;
}

/** The single HTTP response a live scan inspected. */
export interface ScannedDocument {
  status: number;
  contentType: string;
  /** Milliseconds until response headers, measured from the scanning server. */
  responseMs: number;
  /** Decoded HTML bytes inspected. */
  bytes: number;
  truncated: boolean;
  redirects: readonly string[];
  /** Lower-cased response headers; cookie values are omitted. */
  headers: Readonly<Record<string, string>>;
  /** Elements referenced by the HTML document itself. */
  resources: { scripts: number; stylesheets: number; images: number };
}
export interface BrowserRequest {
  url: string;
  /** Browser resource type: document, script, stylesheet, image, font, fetch, … */
  type: string;
  status: number | null;
  bytes: number;
  startMs: number;
  durationMs: number | null;
  failure: string | null;
}
/** What headless Chromium observed while the page's scripts ran. */
export interface BrowserObservation {
  /** URL after redirects and client-side navigation. */
  url: string;
  /** Lab values from the scanning server: desktop viewport, no throttling. */
  vitals: {
    ttfbMs: number | null;
    fcpMs: number | null;
    lcpMs: number | null;
    cls: number | null;
  };
  requests: readonly BrowserRequest[];
  requestsTruncated: boolean;
  consoleErrors: number;
  /** Destinations refused by the scanner's network policy. */
  blocked: readonly string[];
}
export interface AnalysisReport {
  domain: string;
  mode: "sample" | "live";
  /** Final URL that produced the inspected response. */
  url: string;
  /** ISO time of a live scan; null for sample data. */
  scannedAt: string | null;
  notice: string;
  technologies: readonly Technology[];
  findings: readonly Finding[];
  checks: readonly AuditCheck[];
  /** Live scans only. */
  document: ScannedDocument | null;
  /** Live scans whose browser stage succeeded. */
  browser: BrowserObservation | null;
  /** Live scans only. */
  security: SecurityReport | null;
}
