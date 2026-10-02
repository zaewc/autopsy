import type { AuditArea, AuditCheck } from "@/entities/analysis-report";
import { Check, Search } from "lucide-react";
import { useMessages, type Localized } from "@/shared/lib/i18n";
import { SectionHeading } from "@/shared/ui/section-heading";
import { AUDIT_STATUS_LABELS } from "../config/labels";
import { SECTION_LABELS } from "../config/reportSections";
const MESSAGES: Localized<{ title: (area: string) => string }> = {
  en: { title: (area) => `${area} inspection` },
  ko: { title: (area) => `${area} 점검` },
};
export function AuditSection({
  area,
  checks,
  caption,
}: {
  area: AuditArea;
  checks: readonly AuditCheck[];
  caption: string;
}) {
  const t = useMessages(MESSAGES);
  const statuses = useMessages(AUDIT_STATUS_LABELS);
  const label = useMessages(SECTION_LABELS)[area];
  return (
    <section>
      <SectionHeading title={t.title(label)}>
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
                {statuses[status]}
              </span>
              <p>{detail}</p>
            </div>
          ))}
      </div>
    </section>
  );
}
