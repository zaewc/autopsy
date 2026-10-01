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
} from "./lib/detectTechnologies";
export { auditDocument, type AuditInput } from "./lib/auditDocument";
export { ArchitectureDiagram } from "./ui/ArchitectureDiagram";
