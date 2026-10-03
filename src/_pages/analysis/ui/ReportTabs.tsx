import { useMessages, type Localized } from "@/shared/lib/i18n";
import {
  REPORT_SECTIONS,
  SECTION_LABELS,
  type ReportSection,
} from "../config/reportSections";
const MESSAGES: Localized<{ view: string }> = {
  en: { view: "Analysis view" },
  ko: { view: "분석 보기" },
};
export function ReportTabs({
  active,
  findings,
  onSelect,
}: {
  active: ReportSection;
  /** Number of findings in the shown report. */
  findings: number;
  onSelect: (name: ReportSection) => void;
}) {
  const t = useMessages(MESSAGES);
  const labels = useMessages(SECTION_LABELS);
  return (
    <div className="report-tabs" role="tablist" aria-label={t.view}>
      {REPORT_SECTIONS.map(({ name }, index) => (
        <button
          key={name}
          role="tab"
          id={`tab-${name}`}
          aria-controls="report-panel"
          tabIndex={active === name ? 0 : -1}
          aria-selected={active === name}
          className={active === name ? "active" : ""}
          onClick={() => onSelect(name)}
          onKeyDown={(event) => {
            let next = index;
            if (event.key === "ArrowRight")
              next = (index + 1) % REPORT_SECTIONS.length;
            else if (event.key === "ArrowLeft")
              next =
                (index - 1 + REPORT_SECTIONS.length) % REPORT_SECTIONS.length;
            else if (event.key === "Home") next = 0;
            else if (event.key === "End") next = REPORT_SECTIONS.length - 1;
            else return;
            event.preventDefault();
            onSelect(REPORT_SECTIONS[next].name);
            document
              .getElementById(`tab-${REPORT_SECTIONS[next].name}`)
              ?.focus();
          }}
        >
          {labels[name]}
          {name === "Findings" && <span>{findings}</span>}
        </button>
      ))}
    </div>
  );
}
