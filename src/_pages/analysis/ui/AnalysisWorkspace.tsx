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

function scanDescription(report: AnalysisReport) {
  const scanned = report.scannedAt
    ? new Date(report.scannedAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "";
  const parts = [`Scanned ${scanned}`, `HTTP ${report.document?.status}`];
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
  const overview = active === "Overview";
  const live = report.mode === "live";
  const title =
    scan.status === "idle"
      ? live
        ? report.domain
        : "Sample report"
      : scan.target;
  return (
    <div className="app-shell">
      {sidebar && (
        <button
          className="mobile-nav-backdrop"
          aria-label="Close navigation"
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
              aria-label="Toggle navigation"
              aria-expanded={sidebar}
              aria-controls="report-navigation"
              onClick={() => setSidebar(!sidebar)}
            >
              <PanelLeftClose size={17} />
            </button>
            <span className="breadcrumb">Workspace</span>
            <ChevronRight size={13} />
            <Globe size={13} />
            <span className="topbar-title">{title}</span>
          </div>
          {scan.status === "idle" && (
            <div>
              <button
                className="icon-button"
                aria-label="Copy report JSON"
                onClick={() => void copy()}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          )}
        </header>
        <main>
          {scan.status !== "idle" ? (
            <ScanStatus
              scan={scan}
              onCancel={cancelScan}
              onRetry={() => void retry(scan.target)}
              onNew={() => setModal(true)}
              backLabel={live ? "Back to report" : "View sample report"}
            />
          ) : (
            <>
              <div className="eyebrow">
                {live ? "Website report" : "Sample report"}
              </div>
              <div className="report-heading">
                <div>
                  <h1>
                    <span className="domain-title">{title}</span>
                    {live && (
                      <a
                        href={report.url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Open ${report.domain}`}
                      >
                        <ArrowUpRight size={22} />
                      </a>
                    )}
                  </h1>
                  <p>
                    {live
                      ? scanDescription(report)
                      : "Illustrative values for exploring the report layout"}
                  </p>
                </div>
                <div className="report-actions">
                  <button
                    className="secondary-button"
                    onClick={() => setModal(true)}
                  >
                    New analysis
                    <ArrowRight size={14} />
                  </button>
                  <button className="secondary-button" onClick={download}>
                    <Download size={14} />
                    Export report
                  </button>
                </div>
              </div>
              <div className="report-note">
                {live ? (
                  <>
                    <strong>Live scan.</strong> {report.notice}
                  </>
                ) : (
                  <>
                    <strong>Sample report.</strong> These values illustrate a
                    report layout and do not describe any real website.
                  </>
                )}
              </div>
              <ReportTabs active={active} onSelect={setActive} />
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
                    caption={
                      live ? "Checked in the HTML response" : "Sample checks"
                    }
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
          closeLabel="Close new analysis"
          onClose={() => setModal(false)}
          className="analysis-modal"
        >
          <AnalysisForm onSubmit={analyze} />
        </Dialog>
      )}
      {error && (
        <div className="toast" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
