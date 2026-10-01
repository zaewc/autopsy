import { Plus, Clock } from "lucide-react";
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
        autopsy<span className="beta">BETA</span>
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
        <div className="nav-label">
          RECENT ANALYSES <Clock size={12} />
        </div>
        {history.map((h, i) => (
          <button
            key={h}
            onClick={() => {
              onDomain(h);
              onSelect("Overview");
            }}
          >
            <span className={`history-dot ${i === 0 ? "green" : ""}`} />
            {h}
            <span>sample</span>
          </button>
        ))}
      </div>
      <div className="sidebar-bottom">
        <div className="local-status">
          <span className="pulse" />
          Demo workspace<span>v0.1</span>
        </div>
        <div className="profile">
          <span className="avatar">D</span>
          <div>
            Developer workspace<small>Public website intelligence</small>
          </div>
        </div>
      </div>
    </aside>
  );
}
