import { SectionHeading } from "@/shared/ui/section-heading";
import {
  ArchitectureDiagram,
  architectureNodes,
  type AnalysisReport,
} from "@/entities/analysis-report";
export function ArchitectureSection({
  report,
  details = false,
}: {
  report: AnalysisReport;
  details?: boolean;
}) {
  const live = report.mode === "live";
  return (
    <section>
      <SectionHeading title="Architecture signals">
        <div className="legend">
          <span>
            <i />
            Observed
          </span>
          <span>
            <i />
            {live ? "Not observable" : "Inferred"}
          </span>
        </div>
      </SectionHeading>
      <ArchitectureDiagram nodes={architectureNodes(report)} />
      {details && (
        <p className="architecture-note">
          {live
            ? "Only layers with an observed header or markup signal are drawn, in request order. A missing layer means no signal was found, not that the layer is absent. Private servers, databases, and internal topology are unknown."
            : "Only public response headers, document content, and network activity can be observed. The external API is a hypothesis; private servers, databases, and internal topology are unknown."}
        </p>
      )}
    </section>
  );
}
