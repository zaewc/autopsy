"use client";
import { useEffect, useRef } from "react";
import { Plus, X } from "lucide-react";
import { BrandMark } from "@/shared/ui/brand-mark";
import { REPORT_SECTIONS, type ReportSection } from "../config/reportSections";
interface Props {
  sidebar: boolean;
  active: ReportSection;
  history: string[];
  findings: number;
  onAnalyze: () => void;
  onClose: () => void;
  onSelect: (section: ReportSection) => void;
  onDomain: (domain: string) => void;
}
export function ReportSidebar({
  sidebar,
  active,
  history,
  findings,
  onAnalyze,
  onClose,
  onSelect,
  onDomain,
}: Props) {
  const asideRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!sidebar) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    asideRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [sidebar]);
  return (
    <aside
      ref={asideRef}
      id="report-navigation"
      aria-label="Report navigation"
      className={`sidebar ${sidebar ? "open" : ""}`}
      onKeyDown={(event) => {
        if (!sidebar) return;
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
        if (event.key !== "Tab") return;
        const targets =
          asideRef.current?.querySelectorAll<HTMLElement>("a[href], button");
        if (!targets?.length) return;
        const first = targets[0],
          last = targets[targets.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
    >
      <button
        className="sidebar-close icon-button"
        aria-label="Close navigation"
        onClick={onClose}
      >
        <X size={18} />
      </button>
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
        New analysis<kbd aria-hidden="true">⌘ K</kbd>
      </button>
      <div className="nav-label">WORKSPACE</div>
      <nav aria-label="Report sections">
        {REPORT_SECTIONS.map(({ name, icon: Icon }) => (
          <button
            key={name}
            aria-current={active === name ? "page" : undefined}
            aria-controls="report-panel"
            className={`nav-item ${active === name ? "selected" : ""}`}
            onClick={() => {
              onSelect(name);
              onClose();
            }}
          >
            <Icon size={16} />
            {name}
            {name === "Findings" && <span className="count">{findings}</span>}
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
              onClose();
              onDomain(h);
              onSelect("Overview");
            }}
          >
            <span className="history-domain" title={h}>
              {h}
            </span>
            <span className="history-label">sample</span>
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
