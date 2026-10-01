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
export interface AnalysisReport {
  domain: string;
  mode: "sample";
  notice: string;
  technologies: readonly Technology[];
  findings: readonly Finding[];
}
