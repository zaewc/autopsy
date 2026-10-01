export interface Technology {
  logo: string;
  name: string;
  version: string;
  type: string;
  confidence: number;
}
export interface Finding {
  severity: "warning" | "info";
  title: string;
  detail: string;
  why: string;
  fix: string;
  tag: string;
}
export interface AnalysisReport {
  domain: string;
  mode: "sample";
  notice: string;
  score: number;
  technologies: readonly Technology[];
  findings: readonly Finding[];
}
