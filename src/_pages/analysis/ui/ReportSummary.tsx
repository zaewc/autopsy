import {
  SAMPLE_FINDINGS,
  SAMPLE_TECHNOLOGIES,
} from "@/entities/analysis-report";
import { ArrowRight } from "lucide-react";
export function ReportSummary({ onFindings }: { onFindings: () => void }) {
  const warnings = SAMPLE_FINDINGS.filter(
    (finding) => finding.severity === "warning",
  ).length;
  return (
    <div className="overview-banner">
      <div className="health-copy">
        <div>Report contents</div>
        <p>Inspect the example evidence behind each finding.</p>
      </div>
      <div className="summary-metric">
        <strong>{SAMPLE_TECHNOLOGIES.length}</strong>
        <span>Technologies</span>
      </div>
      <div className="summary-metric">
        <strong>{warnings}</strong>
        <span>Warnings</span>
      </div>
      <button className="summary-action" onClick={onFindings}>
        Review {SAMPLE_FINDINGS.length} findings <ArrowRight size={16} />
      </button>
    </div>
  );
}
