import type { AnalysisReport } from "@/entities/analysis-report";
import { ArrowRight } from "lucide-react";
export function ReportSummary({
  report,
  onFindings,
}: {
  report: AnalysisReport;
  onFindings: () => void;
}) {
  const warnings = report.findings.filter(
    (finding) => finding.severity === "warning",
  ).length;
  return (
    <div className="overview-banner">
      <p className="summary-label">
        {report.mode === "live" ? "In this scan" : "In this example"}
      </p>
      <div className="summary-metric">
        <strong>{report.technologies.length}</strong>
        <span>Technologies</span>
      </div>
      <div className="summary-metric">
        <strong>{warnings}</strong>
        <span>Warnings</span>
      </div>
      <button className="summary-action" onClick={onFindings}>
        Review {report.findings.length} finding
        {report.findings.length === 1 ? "" : "s"} <ArrowRight size={16} />
      </button>
    </div>
  );
}
