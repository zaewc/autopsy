"use client";
import {
  ChevronRight,
  Globe,
  PanelLeftClose,
  Check,
  Copy,
  ArrowUpRight,
  Download,
  ArrowRight,
  X,
} from "lucide-react";
import type { AnalysisReport } from "@/entities/analysis-report";
import { AnalysisForm } from "@/features/run-analysis";
import { LocaleSwitch } from "@/features/switch-locale";
import {
  useLocale,
  useMessages,
  type Locale,
  type Localized,
} from "@/shared/lib/i18n";
import { Dialog } from "@/shared/ui/dialog";
import { useReportWorkspace } from "../model/useReportWorkspace";
import { ReportSidebar } from "./ReportSidebar";
import { ReportOverview } from "./ReportOverview";
import { ReportTabs } from "./ReportTabs";
import { ReportFooter } from "./ReportFooter";
import { ScanStatus } from "./ScanStatus";
import { TechnologySection } from "./TechnologySection";
import { ResponseSections } from "./ResponseSections";
import { ArchitectureSection } from "./ArchitectureSection";
import { FindingsSection } from "./FindingsSection";
import { AuditSection } from "./AuditSection";
import { SecurityExplorer } from "./SecurityExplorer";
import "./analysisWorkspace.css";

const MESSAGES: Localized<{
  scanned: (time: string) => string;
  sample: string;
  closeNavigation: string;
  toggleNavigation: string;
  workspace: string;
  copy: string;
  back: string;
  viewSample: string;
  websiteReport: string;
  open: (domain: string) => string;
  sampleDescription: string;
  newAnalysis: string;
  export: string;
  live: string;
  sampleNote: string;
  liveChecks: string;
  sampleChecks: string;
  closeAnalysis: string;
  dismiss: string;
}> = {
  en: {
    scanned: (time) => `Scanned ${time}`,
    sample: "Sample report",
    closeNavigation: "Close navigation",
    toggleNavigation: "Toggle navigation",
    workspace: "Workspace",
    copy: "Copy report JSON",
    back: "Back to report",
    viewSample: "View sample report",
    websiteReport: "Website report",
    open: (domain) => `Open ${domain}`,
    sampleDescription: "Illustrative values for exploring the report layout",
    newAnalysis: "New analysis",
    export: "Export report",
    live: "Live scan.",
    sampleNote:
      "These values illustrate a report layout and do not describe any real website.",
    liveChecks: "Checked in the HTML response",
    sampleChecks: "Sample checks",
    closeAnalysis: "Close new analysis",
    dismiss: "Dismiss",
  },
  ko: {
    scanned: (time) => `${time} 스캔`,
    sample: "샘플 리포트",
    closeNavigation: "탐색 닫기",
    toggleNavigation: "탐색 열기/닫기",
    workspace: "작업 공간",
    copy: "리포트 JSON 복사",
    back: "리포트로 돌아가기",
    viewSample: "샘플 리포트 보기",
    websiteReport: "웹사이트 리포트",
    open: (domain) => `${domain} 열기`,
    sampleDescription: "리포트 구성을 살펴보기 위한 예시 값",
    newAnalysis: "새 분석",
    export: "리포트 내보내기",
    live: "실제 스캔.",
    sampleNote:
      "이 값은 리포트 구성을 보여 주는 예시이며 실제 웹사이트를 설명하지 않습니다.",
    liveChecks: "HTML 응답에서 점검",
    sampleChecks: "샘플 점검",
    closeAnalysis: "새 분석 닫기",
    dismiss: "닫기",
  },
};

function scanDescription(
  report: AnalysisReport,
  locale: Locale,
  scanned: (time: string) => string,
) {
  const time = report.scannedAt
    ? new Date(report.scannedAt).toLocaleString(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "";
  const parts = [scanned(time), `HTTP ${report.document?.status}`];
  if (report.url !== `https://${report.domain}/`) parts.push(report.url);
  return parts.join(" · ");
}

export function AnalysisWorkspace({
  initialSite,
}: {
  initialSite: string | null;
}) {
  const {
    active,
    setActive,
    report,
    show,
    scan,
    analyze,
    retry,
    cancelScan,
    modal,
    setModal,
    sidebar,
    setSidebar,
    history,
    copied,
    error,
    setError,
    copy,
    download,
  } = useReportWorkspace(initialSite);
  const t = useMessages(MESSAGES);
  const locale = useLocale();
  const overview = active === "Overview";
  const live = report.mode === "live";
  const title =
    scan.status === "idle" ? (live ? report.domain : t.sample) : scan.target;
  return (
    <div className="app-shell">
      {sidebar && (
        <button
          className="mobile-nav-backdrop"
          aria-label={t.closeNavigation}
          onClick={() => setSidebar(false)}
        />
      )}
      <ReportSidebar
        sidebar={sidebar}
        active={active}
        history={history}
        current={scan.status === "idle" ? report : null}
        findings={scan.status === "idle" ? report.findings.length : null}
        onAnalyze={() => {
          setModal(true);
          setSidebar(false);
        }}
        onClose={() => setSidebar(false)}
        onSelect={setActive}
        onReport={show}
      />
      <div className="workspace" inert={sidebar}>
        <header className="topbar">
          <div>
            <button
              className="icon-button mobile-menu"
              aria-label={t.toggleNavigation}
              aria-expanded={sidebar}
              aria-controls="report-navigation"
              onClick={() => setSidebar(!sidebar)}
            >
              <PanelLeftClose size={17} />
            </button>
            <span className="breadcrumb">{t.workspace}</span>
            <ChevronRight size={13} />
            <Globe size={13} />
            <span className="topbar-title">{title}</span>
          </div>
          <div>
            <LocaleSwitch />
            {scan.status === "idle" && (
              <button
                className="icon-button"
                aria-label={t.copy}
                onClick={() => void copy()}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            )}
          </div>
        </header>
        <main>
          {scan.status !== "idle" ? (
            <ScanStatus
              scan={scan}
              onCancel={cancelScan}
              onRetry={() => void retry(scan.target)}
              onNew={() => setModal(true)}
              backLabel={live ? t.back : t.viewSample}
            />
          ) : (
            <>
              <div className="eyebrow">{live ? t.websiteReport : t.sample}</div>
              <div className="report-heading">
                <div>
                  <h1>
                    <span className="domain-title">{title}</span>
                    {live && (
                      <a
                        href={report.url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={t.open(report.domain)}
                      >
                        <ArrowUpRight size={22} />
                      </a>
                    )}
                  </h1>
                  <p>
                    {live
                      ? scanDescription(report, locale, t.scanned)
                      : t.sampleDescription}
                  </p>
                </div>
                <div className="report-actions">
                  <button
                    className="secondary-button"
                    onClick={() => setModal(true)}
                  >
                    {t.newAnalysis}
                    <ArrowRight size={14} />
                  </button>
                  <button className="secondary-button" onClick={download}>
                    <Download size={14} />
                    {t.export}
                  </button>
                </div>
              </div>
              <div className="report-note">
                {live ? (
                  <>
                    <strong>{t.live}</strong> {report.notice}
                  </>
                ) : (
                  <>
                    <strong>{t.sample}.</strong> {t.sampleNote}
                  </>
                )}
              </div>
              <ReportTabs
                active={active}
                findings={report.findings.length}
                onSelect={setActive}
              />
              <div
                id="report-panel"
                role="tabpanel"
                aria-labelledby={`tab-${active}`}
                tabIndex={0}
                key={report.url || report.domain}
              >
                {overview && (
                  <ReportOverview report={report} onOpen={setActive} />
                )}
                {active === "Technology" && (
                  <TechnologySection
                    technologies={report.technologies}
                    live={live}
                  />
                )}
                {(active === "Performance" || active === "Network") && (
                  <ResponseSections
                    report={report}
                    view={active === "Network" ? "network" : "performance"}
                  />
                )}
                {active === "Architecture" && (
                  <ArchitectureSection report={report} details />
                )}
                {active === "Findings" && (
                  <FindingsSection findings={report.findings} />
                )}
                {active === "Security" && report.security && (
                  <SecurityExplorer security={report.security} />
                )}
                {((active === "Security" && !report.security) ||
                  active === "Accessibility" ||
                  active === "SEO") && (
                  <AuditSection
                    area={active}
                    checks={report.checks}
                    caption={live ? t.liveChecks : t.sampleChecks}
                  />
                )}
              </div>
            </>
          )}
          <ReportFooter />
        </main>
      </div>
      {modal && (
        <Dialog
          titleId="analysis-title"
          closeLabel={t.closeAnalysis}
          onClose={() => setModal(false)}
          className="analysis-modal"
        >
          <AnalysisForm onSubmit={analyze} />
        </Dialog>
      )}
      {error && (
        <div className="toast" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label={t.dismiss}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
