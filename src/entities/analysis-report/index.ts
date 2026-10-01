export { createSampleReport } from "./model/sampleReport";
export type {
  Technology,
  Finding,
  AuditArea,
  AuditCheck,
  AnalysisReport,
  ScannedDocument,
  BrowserObservation,
  BrowserRequest,
  CookieSummary,
  CspDirective,
  SecurityCategory,
  SecurityHeader,
  SecurityIssue,
  SecuritySeverity,
  TlsSummary,
} from "./model/types";
export {
  detectTechnologies,
  type DocumentSignals,
  type RenderedSignals,
} from "./lib/detectTechnologies";
export { runtimeProbe, type RuntimeSignals } from "./lib/runtimeProbe";
export {
  analyzeSecurity,
  type SecurityAnalysis,
  type SecurityInput,
} from "./lib/analyzeSecurity";
export { auditDocument, type AuditInput } from "./lib/auditDocument";
export {
  architectureNodes,
  type ArchitectureNode,
  type ArchitectureRole,
} from "./lib/architectureNodes";
export { TechnologyLogo } from "./ui/TechnologyLogo";
export { ArchitectureDiagram } from "./ui/ArchitectureDiagram";
