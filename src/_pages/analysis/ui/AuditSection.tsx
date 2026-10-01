import type { AuditArea, AuditCheck } from "@/entities/analysis-report";
import { SectionHeading } from "@/shared/ui/section-heading";
import { Check, Search } from "lucide-react";
export function AuditSection({
  area,
  checks,
  caption,
}: {
  area: AuditArea;
  checks: readonly AuditCheck[];
  caption: string;
}) {
  return (
    <section>
      <SectionHeading title={`${area} inspection`}>
        <span className="muted-caption">{caption}</span>
      </SectionHeading>
      <div className="audit-table">
        {checks
          .filter((check) => check.area === area)
          .map(({ name, status, detail }) => (
            <div className="audit-row" key={name}>
              <strong>{name}</strong>
              <span className={status === "Passed" ? "green-text" : "amber"}>
                {status === "Passed" ? (
                  <Check size={14} />
                ) : (
                  <Search size={14} />
                )}{" "}
                {status}
              </span>
              <p>{detail}</p>
            </div>
          ))}
      </div>
    </section>
  );
}
