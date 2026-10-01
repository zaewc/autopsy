import { REPORT_SECTIONS, type ReportSection } from "../config/reportSections";
export function ReportTabs({
  active,
  onSelect,
}: {
  active: ReportSection;
  onSelect: (name: ReportSection) => void;
}) {
  return (
    <div className="report-tabs" role="tablist" aria-label="Analysis view">
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
          {name}
          {name === "Findings" && <span>3</span>}
        </button>
      ))}
    </div>
  );
}
