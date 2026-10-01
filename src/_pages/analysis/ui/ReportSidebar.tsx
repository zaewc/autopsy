import { Plus } from "lucide-react";
import { BrandMark } from "@/shared/ui/brand-mark";
import { REPORT_SECTIONS, type ReportSection } from "../config/reportSections";
interface Props {
  sidebar: boolean;
  active: ReportSection;
  history: string[];
  onAnalyze: () => void;
  onClose: () => void;
  onSelect: (section: ReportSection) => void;
  onDomain: (domain: string) => void;
}
export function ReportSidebar({
  sidebar,
  active,
  history,
  onAnalyze,
  onClose,
  onSelect,
  onDomain,
}: Props) {
  return (
    <aside className={`sidebar ${sidebar ? "open" : ""}`}>
      <a className="brand" href="/new" aria-label="autopsy home">
        <BrandMark />
        autopsy
      </a>
      <button
        className="new-analysis"
        onClick={() => {
          onAnalyze();
          onClose();
        }}
      >
        <Plus size={16} />
        New analysis<kbd>⌘ K</kbd>
      </button>
      <div className="nav-label">WORKSPACE</div>
      <nav aria-label="Report sections">
        {REPORT_SECTIONS.map(({ name, icon: Icon }) => (
          <button
            key={name}
            className={`nav-item ${active === name ? "selected" : ""}`}
            onClick={() => {
              onSelect(name);
              onClose();
            }}
          >
            <Icon size={16} />
            {name}
            {name === "Findings" && <span className="count">3</span>}
            {active === name && <span className="nav-dot" />}
          </button>
        ))}
      </nav>
      <div className="recent">
        <div className="nav-label">SAMPLE HISTORY</div>
        {history.map((h) => (
          <button
            key={h}
            onClick={() => {
              onDomain(h);
              onSelect("Overview");
            }}
          >
            {h}
            <span>sample</span>
          </button>
        ))}
      </div>
      <div className="sidebar-bottom">
        <p className="sidebar-note">
          Sample workspace
          <br />
          <span>No live scans are performed.</span>
        </p>
      </div>
    </aside>
  );
}
