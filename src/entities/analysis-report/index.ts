export { createSampleReport } from "./model/sampleReport";
export type {
  Technology,
  Finding,
  AuditArea,
  AuditCheck,
  AnalysisReport,
  ScannedDocument,
} from "./model/types";
export {
  detectTechnologies,
  type DocumentSignals,
  type RenderedSignals,
} from "./lib/detectTechnologies";
export { runtimeProbe, type RuntimeSignals } from "./lib/runtimeProbe";
export { auditDocument, type AuditInput } from "./lib/auditDocument";
export {
  architectureNodes,
  type ArchitectureNode,
  type ArchitectureRole,
} from "./lib/architectureNodes";
export { ArchitectureDiagram } from "./ui/ArchitectureDiagram";
