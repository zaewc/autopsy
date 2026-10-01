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
}
