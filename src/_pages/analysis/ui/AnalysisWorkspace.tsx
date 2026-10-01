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
import { AnalysisForm } from "@/features/run-analysis";
import { Dialog } from "@/shared/ui/dialog";
import { useReportWorkspace } from "../model/useReportWorkspace";
import { ReportSidebar } from "./ReportSidebar";
import { ReportSummary } from "./ReportSummary";
import { ReportTabs } from "./ReportTabs";
import { ReportFooter } from "./ReportFooter";
import { TechnologySection } from "./TechnologySection";
import { PerformanceSection } from "./PerformanceSection";
import { ArchitectureSection } from "./ArchitectureSection";
import { FindingsSection } from "./FindingsSection";
import { AuditSection } from "./AuditSection";
import "./analysisWorkspace.css";
export function AnalysisWorkspace({
  initialDomain,
}: {
  initialDomain: string;
}) {
  const {
    active,
    setActive,
    domain,
    setDomain,
    modal,
    setModal,
    sidebar,
    setSidebar,
    history,
    copied,
    error,
    setError,
    completeScan,
    copy,
    download,
  } = useReportWorkspace(initialDomain);
  const overview = active === "Overview";
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
        onAnalyze={() => {
          setModal(true);
          setSidebar(false);
        }}
        onClose={() => setSidebar(false)}
        onSelect={setActive}
        onDomain={setDomain}
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
            <span>{domain}</span>
          </div>
          <div>
            <button
              className="icon-button"
              aria-label="Copy report JSON"
              onClick={() => void copy()}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </header>
        <main>
          <div className="eyebrow">Website report</div>
          <div className="report-heading">
            <div>
              <h1>
                <span className="domain-title">{domain}</span>
                <a
                  href={`https://${domain}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open ${domain}`}
                >
                  <ArrowUpRight size={22} />
                </a>
              </h1>
              <p>Technology, resource timings, and findings</p>
            </div>
            <div className="report-actions">
              <button
                className="secondary-button"
                onClick={() => setModal(true)}
              >
                New sample
                <ArrowRight size={14} />
              </button>
              <button className="secondary-button" onClick={download}>
                <Download size={14} />
                Export report
              </button>
            </div>
          </div>
          <div className="sample-note">
            <strong>Sample report.</strong> These values illustrate a report
            layout; no live website scan has been performed.
          </div>
          <ReportSummary onFindings={() => setActive("Findings")} />
          <ReportTabs active={active} onSelect={setActive} />
          <div
            id="report-panel"
            role="tabpanel"
            aria-labelledby={`tab-${active}`}
            tabIndex={0}
            key={domain}
          >
            {(overview || active === "Technology") && <TechnologySection />}
            {(overview || active === "Performance" || active === "Network") && (
              <PerformanceSection network={active === "Network"} />
            )}
            {(overview || active === "Architecture") && (
              <ArchitectureSection details={active === "Architecture"} />
            )}
            {(overview || active === "Findings") && <FindingsSection />}
            {(active === "Security" ||
              active === "Accessibility" ||
              active === "SEO") && <AuditSection active={active} />}
          </div>
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
          <AnalysisForm onComplete={completeScan} />
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
