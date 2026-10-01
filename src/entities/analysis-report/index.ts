export {
  SAMPLE_TECHNOLOGIES,
  SAMPLE_FINDINGS,
  createSampleReport,
} from "./model/sampleReport";
export type { Technology, Finding, AnalysisReport } from "./model/types";
export {
  detectTechnologies,
  type DocumentSignals,
} from "./lib/detectTechnologies";
export { ArchitectureDiagram } from "./ui/ArchitectureDiagram";
