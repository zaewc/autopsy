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
}
