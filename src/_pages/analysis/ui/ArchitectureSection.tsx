import { SectionHeading } from "@/shared/ui/section-heading";
import { ArchitectureDiagram } from "@/entities/analysis-report";
export function ArchitectureSection({
  details = false,
  live,
}: {
  details?: boolean;
  live: boolean;
}) {
  if (live)
    return (
      <section>
        <SectionHeading title="Architecture signals" />
        <p className="empty-note">
          The architecture view is only drawn for the sample report. For this
          scan, hosting and CDN signals are listed under Technology.
        </p>
      </section>
    );
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
            Inferred
          </span>
        </div>
      </SectionHeading>
      <ArchitectureDiagram />
      {details && (
        <p className="architecture-note">
          Only public response headers, document content, and network activity
          can be observed. The external API is a hypothesis; private servers,
          databases, and internal topology are unknown.
        </p>
      )}
    </section>
  );
}
