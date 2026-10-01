import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import {
  architectureNodes,
  TechnologyLogo,
  type AnalysisReport,
  type AuditArea,
} from "@/entities/analysis-report";
import type { ReportSection } from "../config/reportSections";
import {
  SAMPLE_REQUESTS,
  SAMPLE_TRANSFER_KB,
  SAMPLE_VITALS,
} from "../config/sampleMetrics";
import { formatCount, formatKilobytes, formatMs } from "../lib/formatMetrics";
import { displayVital, LAB_VITALS, rateVital } from "../lib/vitals";
import "./reportOverview.css";

function Row({
  section,
  summary,
  onOpen,
  children,
}: {
  section: ReportSection;
  summary: string;
  onOpen: (section: ReportSection) => void;
  children?: ReactNode;
}) {
  return (
    <div className="glance-row">
      <button
        className="glance-section"
        onClick={() => onOpen(section)}
        aria-label={`Open ${section}: ${summary}`}
      >
        <span>{section}</span>
        <ArrowRight size={14} aria-hidden="true" />
      </button>
      <div className="glance-body">
        <p className="glance-summary">{summary}</p>
        {children}
      </div>
    </div>
  );
}

function plural(count: number, word: string, many = `${word}s`) {
  return `${formatCount(count)} ${count === 1 ? word : many}`;
}

function performance(report: AnalysisReport) {
  if (report.browser) {
    const vitals = LAB_VITALS.map(({ key, short, limits }) => {
      const value = report.browser?.vitals[key] ?? null;
      if (value === null)
        return { short, text: "—", label: "Not reported", warn: false };
      const { value: shown, unit } = displayVital(key, value);
      const rated = rateVital(value, limits);
      return {
        short,
        text: `${shown}${unit ? ` ${unit}` : ""}`,
        label: rated.label,
        warn: rated.tone === "warn",
      };
    });
    const poor = vitals.filter(({ warn }) => warn).length;
    return {
      summary: poor
        ? `${plural(poor, "lab metric")} ${poor === 1 ? "needs" : "need"} attention`
        : "Lab metrics are within the good thresholds",
      vitals,
    };
  }
  if (report.document)
    return {
      summary: `Server response in ${formatMs(report.document.responseMs)}; browser metrics were not measured`,
      vitals: [],
    };
  return {
    summary: "Illustrative values; not measured",
    vitals: SAMPLE_VITALS.map(({ short, value, unit, caption }) => ({
      short,
      text: `${value}${unit ? ` ${unit}` : ""}`,
      label: caption,
      warn: false,
    })),
  };
}

function network(report: AnalysisReport) {
  const { browser, document } = report;
  if (browser) {
    const failed = browser.requests.filter(({ failure }) => failure).length;
    const bytes = browser.requests.reduce((sum, { bytes }) => sum + bytes, 0);
    const parts = [
      `${plural(browser.requests.length, "request")}${browser.requestsTruncated ? "+" : ""}`,
      formatKilobytes(bytes),
      `${formatCount(failed)} failed`,
    ];
    if (browser.blocked.length)
      parts.push(
        `${formatCount(browser.blocked.length)} refused by the scanner`,
      );
    return parts.join(" · ");
  }
  if (document)
    return `HTTP ${document.status} · ${plural(document.redirects.length, "redirect")} · ${plural(Object.keys(document.headers).length, "response header")}`;
  return `${plural(SAMPLE_REQUESTS.length, "example request")} · ${SAMPLE_TRANSFER_KB} kB (illustrative)`;
}

function audit(report: AnalysisReport, area: AuditArea) {
  const checks = report.checks.filter((check) => check.area === area);
  const review = checks.filter(({ status }) => status === "Review");
  const passed = checks.filter(({ status }) => status === "Passed").length;
  return {
    summary: `${formatCount(passed)} passed · ${formatCount(review.length)} to review`,
    review: review.map(({ name }) => name),
  };
}

function securitySummary(security: NonNullable<AnalysisReport["security"]>) {
  const counts = (["high", "medium", "low", "info"] as const)
    .map(
      (severity) =>
        [
          severity,
          security.issues.filter((issue) => issue.severity === severity).length,
        ] as const,
    )
    .filter(([, count]) => count > 0)
    .map(([severity, count]) => `${formatCount(count)} ${severity}`);
  const advisories = security.vulnerabilities.length
    ? ` · ${plural(security.vulnerabilities.length, "known vulnerability", "known vulnerabilities")}`
    : "";
  return (counts.join(" · ") || "No issues from passive checks") + advisories;
}

/** Every report area in one view, each linking to its full section. */
export function ReportOverview({
  report,
  onOpen,
}: {
  report: AnalysisReport;
  onOpen: (section: ReportSection) => void;
}) {
  const observed = report.technologies.filter(
    ({ basis }) => basis === "Observed",
  ).length;
  const inferred = report.technologies.length - observed;
  const speed = performance(report);
  const path = architectureNodes(report);
  const warnings = report.findings.filter(
    ({ severity }) => severity === "warning",
  ).length;
  return (
    <section className="glance" aria-label="Report overview">
      <Row
        section="Technology"
        summary={
          report.technologies.length
            ? `${plural(observed, "observed technology", "observed technologies")}${inferred ? ` · ${formatCount(inferred)} inferred` : ""}`
            : "No technology signatures found"
        }
        onOpen={onOpen}
      >
        {report.technologies.length > 0 && (
          <ul className="glance-technologies">
            {report.technologies.map(({ name, version, basis }) => (
              <li
                key={name}
                className={basis === "Inferred" ? "inferred" : undefined}
              >
                <TechnologyLogo name={name} />
                {name}
                {version && <small>{version}</small>}
                {basis === "Inferred" && <small>inferred</small>}
              </li>
            ))}
          </ul>
        )}
      </Row>
      <Row section="Performance" summary={speed.summary} onOpen={onOpen}>
        {speed.vitals.length > 0 && (
          <dl className="glance-metrics">
            {speed.vitals.map(({ short, text, label, warn }) => (
              <div key={short}>
                <dt>{short}</dt>
                <dd>
                  {text}
                  <span className={warn ? "amber" : undefined}>{label}</span>
                </dd>
              </div>
            ))}
          </dl>
        )}
      </Row>
      <Row section="Network" summary={network(report)} onOpen={onOpen} />
      <Row
        section="Architecture"
        summary={path.map(({ name }) => name).join(" → ")}
        onOpen={onOpen}
      />
      {report.security && (
        <Row
          section="Security"
          summary={securitySummary(report.security)}
          onOpen={onOpen}
        >
          {report.security.issues.some(
            ({ severity }) => severity !== "info",
          ) && (
            <ul className="glance-findings">
              {report.security.issues
                .filter(({ severity }) => severity !== "info")
                .slice(0, 3)
                .map(({ id, title, severity }) => (
                  <li key={id}>
                    <span className={`severity security-${severity}`}>
                      {severity}
                    </span>
                    {title}
                  </li>
                ))}
            </ul>
          )}
        </Row>
      )}
      {(report.security
        ? (["Accessibility", "SEO"] as const)
        : (["Security", "Accessibility", "SEO"] as const)
      ).map((area) => {
        const { summary, review } = audit(report, area);
        return (
          <Row key={area} section={area} summary={summary} onOpen={onOpen}>
            {review.length > 0 && (
              <p className="glance-detail">Review: {review.join(", ")}</p>
            )}
          </Row>
        );
      })}
      <Row
        section="Findings"
        summary={
          report.findings.length
            ? `${plural(warnings, "warning")} · ${formatCount(report.findings.length - warnings)} info`
            : "No findings"
        }
        onOpen={onOpen}
      >
        {report.findings.length > 0 && (
          <ul className="glance-findings">
            {report.findings.slice(0, 3).map(({ title, severity }) => (
              <li key={title}>
                <span className={`severity ${severity}`}>{severity}</span>
                {title}
              </li>
            ))}
            {report.findings.length > 3 && (
              <li className="glance-more">
                {formatCount(report.findings.length - 3)} more in Findings
              </li>
            )}
          </ul>
        )}
      </Row>
    </section>
  );
}
