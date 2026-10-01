import { SectionHeading } from "@/shared/ui/section-heading";
import { ArchitectureDiagram } from "@/entities/analysis-report";
export function ArchitectureSection({
  details = false,
}: {
  details?: boolean;
}) {
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
