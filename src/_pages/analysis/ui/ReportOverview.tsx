import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import {
  architectureNodes,
  TechnologyLogo,
  type AnalysisReport,
  type AuditArea,
} from "@/entities/analysis-report";
import { useLocale, useMessages, type Localized } from "@/shared/lib/i18n";
import {
  FINDING_SEVERITY_LABELS,
  SECURITY_SEVERITY_LABELS,
  VITAL_RATING_LABELS,
} from "../config/labels";
import { SECTION_LABELS, type ReportSection } from "../config/reportSections";
import {
  SAMPLE_REQUESTS,
  SAMPLE_TRANSFER_KB,
  SAMPLE_VITALS,
} from "../config/sampleMetrics";
import { formatCount, formatKilobytes, formatMs } from "../lib/formatMetrics";
import { displayVital, LAB_VITALS, rateVital } from "../lib/vitals";
import "./reportOverview.css";

const en = {
  overview: "Report overview",
  open: (section: string, summary: string) => `Open ${section}: ${summary}`,
  notReported: "Not reported",
  labMetricsAttention: (count: number) =>
    `${formatCount(count)} lab metric${count === 1 ? " needs" : "s need"} attention`,
  labMetricsGood: "Lab metrics are within the good thresholds",
  serverOnly: (time: string) =>
    `Server response in ${time}; browser metrics were not measured`,
  illustrative: "Illustrative values; not measured",
  requests: (count: number, more: boolean) =>
    `${formatCount(count)} request${count === 1 ? "" : "s"}${more ? "+" : ""}`,
  failed: (count: number) => `${formatCount(count)} failed`,
  refused: (count: number) => `${formatCount(count)} refused by the scanner`,
  redirects: (count: number) =>
    `${formatCount(count)} redirect${count === 1 ? "" : "s"}`,
  headers: (count: number) =>
    `${formatCount(count)} response header${count === 1 ? "" : "s"}`,
  sampleRequests: (count: number, kilobytes: number) =>
    `${formatCount(count)} example requests · ${kilobytes} kB (illustrative)`,
  audit: (passed: number, review: number) =>
    `${formatCount(passed)} passed · ${formatCount(review)} to review`,
  review: (names: string) => `Review: ${names}`,
  severityCount: (count: number, severity: string) =>
    `${formatCount(count)} ${severity}`,
  vulnerabilities: (count: number) =>
    `${formatCount(count)} known vulnerabilit${count === 1 ? "y" : "ies"}`,
  noSecurityIssues: "No issues from passive checks",
  technologies: (observed: number, inferred: number) =>
    `${formatCount(observed)} observed technolog${observed === 1 ? "y" : "ies"}${inferred ? ` · ${formatCount(inferred)} inferred` : ""}`,
  noTechnologies: "No technology signatures found",
  inferred: "inferred",
  findings: (warnings: number, info: number) =>
    `${formatCount(warnings)} warning${warnings === 1 ? "" : "s"} · ${formatCount(info)} info`,
  noFindings: "No findings",
  more: (count: number) => `${formatCount(count)} more in Findings`,
};
type Messages = typeof en;
const MESSAGES: Localized<Messages> = {
  en,
  ko: {
    overview: "리포트 개요",
    open: (section, summary) => `${section} 열기: ${summary}`,
    notReported: "보고되지 않음",
    labMetricsAttention: (count) =>
      `lab 지표 ${formatCount(count)}개를 확인해야 합니다`,
    labMetricsGood: "lab 지표가 모두 좋음 기준 안에 있습니다",
    serverOnly: (time) =>
      `서버 응답 ${time}, 브라우저 지표는 측정하지 않았습니다`,
    illustrative: "예시 값이며 측정하지 않았습니다",
    requests: (count, more) => `요청 ${formatCount(count)}${more ? "+" : ""}개`,
    failed: (count) => `실패 ${formatCount(count)}개`,
    refused: (count) => `스캐너가 차단 ${formatCount(count)}개`,
    redirects: (count) => `리디렉션 ${formatCount(count)}개`,
    headers: (count) => `응답 헤더 ${formatCount(count)}개`,
    sampleRequests: (count, kilobytes) =>
      `예시 요청 ${formatCount(count)}개 · ${kilobytes} kB (예시)`,
    audit: (passed, review) =>
      `통과 ${formatCount(passed)}개 · 검토 필요 ${formatCount(review)}개`,
    review: (names) => `검토: ${names}`,
    severityCount: (count, severity) => `${severity} ${formatCount(count)}개`,
    vulnerabilities: (count) => `알려진 취약점 ${formatCount(count)}개`,
    noSecurityIssues: "passive 점검에서 발견된 문제가 없습니다",
    technologies: (observed, inferred) =>
      `관측된 기술 ${formatCount(observed)}개${inferred ? ` · 추론 ${formatCount(inferred)}개` : ""}`,
    noTechnologies: "기술 시그니처를 찾지 못했습니다",
    inferred: "추론",
    findings: (warnings, info) =>
      `경고 ${formatCount(warnings)}개 · 정보 ${formatCount(info)}개`,
    noFindings: "발견 사항이 없습니다",
    more: (count) => `발견 사항에 ${formatCount(count)}개 더 있습니다`,
  },
};

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
  const t = useMessages(MESSAGES);
  const label = useMessages(SECTION_LABELS)[section];
  return (
    <div className="glance-row">
      <button
        className="glance-section"
        onClick={() => onOpen(section)}
        aria-label={t.open(label, summary)}
      >
        <span>{label}</span>
        <ArrowRight size={14} aria-hidden="true" />
      </button>
      <div className="glance-body">
        <p className="glance-summary">{summary}</p>
        {children}
      </div>
    </div>
  );
}

function performance(
  report: AnalysisReport,
  t: Messages,
  ratings: Readonly<Record<string, string>>,
) {
  if (report.browser) {
    const vitals = LAB_VITALS.map(({ key, short, limits }) => {
      const value = report.browser?.vitals[key] ?? null;
      if (value === null)
        return { short, text: "—", label: t.notReported, warn: false };
      const { value: shown, unit } = displayVital(key, value);
      const rated = rateVital(value, limits);
      return {
        short,
        text: `${shown}${unit ? ` ${unit}` : ""}`,
        label: ratings[rated.rating],
        warn: rated.tone === "warn",
      };
    });
    const poor = vitals.filter(({ warn }) => warn).length;
    return {
      summary: poor ? t.labMetricsAttention(poor) : t.labMetricsGood,
      vitals,
    };
  }
  if (report.document)
    return {
      summary: t.serverOnly(formatMs(report.document.responseMs)),
      vitals: [],
    };
  return {
    summary: t.illustrative,
    vitals: SAMPLE_VITALS.map(({ short, value, unit, rating }) => ({
      short,
      text: `${value}${unit ? ` ${unit}` : ""}`,
      label: ratings[rating],
      warn: false,
    })),
  };
}

function network(report: AnalysisReport, t: Messages) {
  const { browser, document } = report;
  if (browser) {
    const failed = browser.requests.filter(({ failure }) => failure).length;
    const bytes = browser.requests.reduce((sum, { bytes }) => sum + bytes, 0);
    const parts = [
      t.requests(browser.requests.length, browser.requestsTruncated),
      formatKilobytes(bytes),
      t.failed(failed),
    ];
    if (browser.blocked.length) parts.push(t.refused(browser.blocked.length));
    return parts.join(" · ");
  }
  if (document)
    return `HTTP ${document.status} · ${t.redirects(document.redirects.length)} · ${t.headers(Object.keys(document.headers).length)}`;
  return t.sampleRequests(SAMPLE_REQUESTS.length, SAMPLE_TRANSFER_KB);
}

function audit(report: AnalysisReport, area: AuditArea, t: Messages) {
  const checks = report.checks.filter((check) => check.area === area);
  const review = checks.filter(({ status }) => status === "Review");
  const passed = checks.filter(({ status }) => status === "Passed").length;
  return {
    summary: t.audit(passed, review.length),
    review: review.map(({ name }) => name),
  };
}

function securitySummary(
  security: NonNullable<AnalysisReport["security"]>,
  t: Messages,
  severities: Readonly<Record<string, string>>,
) {
  const counts = (["high", "medium", "low", "info"] as const)
    .map(
      (severity) =>
        [
          severity,
          security.issues.filter((issue) => issue.severity === severity).length,
        ] as const,
    )
    .filter(([, count]) => count > 0)
    .map(([severity, count]) => t.severityCount(count, severities[severity]));
  const advisories = security.vulnerabilities.length
    ? ` · ${t.vulnerabilities(security.vulnerabilities.length)}`
    : "";
  return (counts.join(" · ") || t.noSecurityIssues) + advisories;
}

/** Every report area in one view, each linking to its full section. */
export function ReportOverview({
  report,
  onOpen,
}: {
  report: AnalysisReport;
  onOpen: (section: ReportSection) => void;
}) {
  const t = useMessages(MESSAGES);
  const locale = useLocale();
  const ratings = useMessages(VITAL_RATING_LABELS);
  const severities = useMessages(SECURITY_SEVERITY_LABELS);
  const findingSeverities = useMessages(FINDING_SEVERITY_LABELS);
  const observed = report.technologies.filter(
    ({ basis }) => basis === "Observed",
  ).length;
  const inferred = report.technologies.length - observed;
  const speed = performance(report, t, ratings);
  const path = architectureNodes(report, locale);
  const warnings = report.findings.filter(
    ({ severity }) => severity === "warning",
  ).length;
  return (
    <section className="glance" aria-label={t.overview}>
      <Row
        section="Technology"
        summary={
          report.technologies.length
            ? t.technologies(observed, inferred)
            : t.noTechnologies
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
                {basis === "Inferred" && <small>{t.inferred}</small>}
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
      <Row section="Network" summary={network(report, t)} onOpen={onOpen} />
      <Row
        section="Architecture"
        summary={path.map(({ name }) => name).join(" → ")}
        onOpen={onOpen}
      />
      {report.security && (
        <Row
          section="Security"
          summary={securitySummary(report.security, t, severities)}
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
                      {severities[severity]}
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
        const { summary, review } = audit(report, area, t);
        return (
          <Row key={area} section={area} summary={summary} onOpen={onOpen}>
            {review.length > 0 && (
              <p className="glance-detail">{t.review(review.join(", "))}</p>
            )}
          </Row>
        );
      })}
      <Row
        section="Findings"
        summary={
          report.findings.length
            ? t.findings(warnings, report.findings.length - warnings)
            : t.noFindings
        }
        onOpen={onOpen}
      >
        {report.findings.length > 0 && (
          <ul className="glance-findings">
            {report.findings.slice(0, 3).map(({ title, severity }) => (
              <li key={title}>
                <span className={`severity ${severity}`}>
                  {findingSeverities[severity]}
                </span>
                {title}
              </li>
            ))}
            {report.findings.length > 3 && (
              <li className="glance-more">
                {t.more(report.findings.length - 3)}
              </li>
            )}
          </ul>
        )}
      </Row>
    </section>
  );
}
