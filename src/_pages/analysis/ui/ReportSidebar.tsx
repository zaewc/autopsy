"use client";
import { useEffect, useRef } from "react";
import { Plus, X } from "lucide-react";
import type { AnalysisReport } from "@/entities/analysis-report";
import { useLocale, useMessages, type Localized } from "@/shared/lib/i18n";
import { BrandMark } from "@/shared/ui/brand-mark";
import {
  REPORT_SECTIONS,
  SECTION_LABELS,
  type ReportSection,
} from "../config/reportSections";
const MESSAGES: Localized<{
  navigation: string;
  close: string;
  home: string;
  newAnalysis: string;
  workspace: string;
  sections: string;
  recent: string;
  note: string;
}> = {
  en: {
    navigation: "Report navigation",
    close: "Close navigation",
    home: "autopsy home",
    newAnalysis: "New analysis",
    workspace: "WORKSPACE",
    sections: "Report sections",
    recent: "RECENT SCANS",
    note: "Live scans load each page once in a headless browser.",
  },
  ko: {
    navigation: "리포트 탐색",
    close: "탐색 닫기",
    home: "autopsy 홈",
    newAnalysis: "새 분석",
    workspace: "작업 공간",
    sections: "리포트 섹션",
    recent: "최근 스캔",
    note: "실제 스캔은 각 페이지를 headless 브라우저에서 한 번 불러옵니다.",
  },
};
interface Props {
  sidebar: boolean;
  active: ReportSection;
  history: readonly AnalysisReport[];
  current: AnalysisReport | null;
  /** Null while no report is shown. */
  findings: number | null;
  onAnalyze: () => void;
  onClose: () => void;
  onSelect: (section: ReportSection) => void;
  onReport: (report: AnalysisReport) => void;
}
export function ReportSidebar({
  sidebar,
  active,
  history,
  current,
  findings,
  onAnalyze,
  onClose,
  onSelect,
  onReport,
}: Props) {
  const t = useMessages(MESSAGES);
  const labels = useMessages(SECTION_LABELS);
  const locale = useLocale();
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
      aria-label={t.navigation}
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
        aria-label={t.close}
        onClick={onClose}
      >
        <X size={18} />
      </button>
      <a className="brand" href="/new" aria-label={t.home}>
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
        {t.newAnalysis}
        <kbd aria-hidden="true">⌘ K</kbd>
      </button>
      <div className="nav-label">{t.workspace}</div>
      <nav aria-label={t.sections}>
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
            {labels[name]}
            {name === "Findings" && findings !== null && (
              <span className="count">{findings}</span>
            )}
            {active === name && <span className="nav-dot" />}
          </button>
        ))}
      </nav>
      {history.length > 0 && (
        <div className="recent">
          <div className="nav-label">{t.recent}</div>
          {history.map((report) => (
            <button
              key={report.url}
              aria-current={current?.url === report.url ? "true" : undefined}
              onClick={() => {
                onClose();
                onReport(report);
              }}
            >
              <span className="history-domain" title={report.url}>
                {report.domain}
              </span>
              {report.scannedAt && (
                <span className="history-label">
                  {new Date(report.scannedAt).toLocaleTimeString(locale, {
                    timeStyle: "short",
                  })}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      <div className="sidebar-bottom">
        <p className="sidebar-note">{t.note}</p>
      </div>
    </aside>
  );
}
