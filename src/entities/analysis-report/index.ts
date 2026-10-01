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
  ThirdPartyScript,
  KnownVulnerability,
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
export {
  analyzeContent,
  type ContentAnalysis,
  type ContentInput,
} from "./lib/analyzeContent";
export {
  advisorySeverity,
  dependencyIssues,
  dependencyQueries,
  type DependencyQuery,
} from "./lib/dependencies";
export { auditDocument, type AuditInput } from "./lib/auditDocument";
export {
  architectureNodes,
  type ArchitectureNode,
  type ArchitectureRole,
} from "./lib/architectureNodes";
export { TechnologyLogo } from "./ui/TechnologyLogo";
export { ArchitectureDiagram } from "./ui/ArchitectureDiagram";
