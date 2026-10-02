"use client";
import { useMemo, useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import type {
  SecurityCategory,
  SecurityReport,
  SecuritySeverity,
} from "@/entities/analysis-report";
import {
  useLocale,
  useMessages,
  type Locale,
  type Localized,
} from "@/shared/lib/i18n";
import { SectionHeading } from "@/shared/ui/section-heading";
import { SECURITY_SEVERITY_LABELS } from "../config/labels";
import { formatCount } from "../lib/formatMetrics";
import { LongValue } from "./LongValue";
import "./securityExplorer.css";

const SEVERITIES: readonly SecuritySeverity[] = [
  "high",
  "medium",
  "low",
  "info",
];
const CATEGORIES: readonly SecurityCategory[] = [
  "Transport",
  "Content Security Policy",
  "Headers",
  "Cookies",
  "Content",
  "Dependencies",
  "Disclosure",
];
const EVIDENCE_SECTIONS = [
  "TLS and certificate",
  "Security headers",
  "Content Security Policy",
  "Cookies",
  "Third-party scripts",
  "Known vulnerabilities",
  "security.txt",
] as const;
type EvidenceSection = (typeof EVIDENCE_SECTIONS)[number];
const evidenceId = (section: EvidenceSection) =>
  `security-${section.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
const DAY = 86_400_000;

const en = {
  categories: {
    Transport: "Transport",
    "Content Security Policy": "Content Security Policy",
    Headers: "Headers",
    Cookies: "Cookies",
    Content: "Content",
    Dependencies: "Dependencies",
    Disclosure: "Disclosure",
  } as Readonly<Record<SecurityCategory, string>>,
  sections: {
    "TLS and certificate": "TLS and certificate",
    "Security headers": "Security headers",
    "Content Security Policy": "Content Security Policy",
    Cookies: "Cookies",
    "Third-party scripts": "Third-party scripts",
    "Known vulnerabilities": "Known vulnerabilities",
    "security.txt": "security.txt",
  } as Readonly<Record<EvidenceSection, string>>,
  search: "Search issues",
  searchPlaceholder: "Title, evidence, package or advisory",
  sortBy: "Sort by",
  bySeverity: "Severity: highest first",
  byTitle: "Title: A–Z",
  severity: "Severity",
  category: "Category",
  all: (count: number) => `All (${count})`,
  shown: (shown: number, total: number) => `${shown} of ${total} issues`,
  reset: "Reset filters",
  evidence: "Evidence",
  why: "Why it matters",
  fix: "How to fix",
  noMatch: "No issues match these filters.",
  noIssues: "No issues were found by these passive checks.",
  yes: "Yes",
  no: "No",
  title: "Security review",
  caption: "Passive · response, loaded resources, advisories",
  scope:
    "Built from the response the scanner fetched, what the page loaded in the browser, OSV.dev advisories for observed library versions, and security.txt. No attack payloads, path guessing, or logins were sent, so these are configuration weaknesses and known advisories, not confirmed exploits.",
  evidenceNav: "Security evidence",
  inspect: "Inspect evidence",
  chainVerified: "Chain verified",
  chainUnverified: "Chain not verified",
  plainHttp: "Plain HTTP",
  protocol: "Protocol",
  cipher: "Cipher",
  subject: "Subject",
  issuer: "Issuer",
  names: "Names",
  validUntil: "Valid until",
  daysLeft: (days: string) => ` (${days} days left)`,
  notHttps: "The page was not served over HTTPS.",
  headersSent: (sent: number, total: number) => `${sent} of ${total} sent`,
  missing: "Missing",
  reportOnly: "Report-only",
  enforced: "Enforced",
  notSet: "Not set",
  noSources: "(no sources)",
  noPolicy: "No policy was sent.",
  cookiesSet: (count: number) => `${count} set · values not stored`,
  name: "Name",
  lifetime: "Lifetime",
  persistent: "Persistent",
  session: "Session",
  noCookies: "The response set no cookies.",
  origins: (count: number) => `${count} origin${count === 1 ? "" : "s"}`,
  scripts: (count: number, withIntegrity: number) =>
    `${count} script${count === 1 ? "" : "s"} · ${withIntegrity} with integrity`,
  noThirdParty: "No scripts load from other sites.",
  packagesChecked: (count: number) =>
    `${count} package${count === 1 ? "" : "s"} checked in OSV.dev`,
  osvUnavailable: "OSV.dev lookup unavailable",
  noVersions: "No exact library versions observed",
  package: "Package",
  advisory: "Advisory",
  fixedIn: "Fixed in",
  noAdvisories: (packages: string) => `No advisories for ${packages}.`,
  couldNotCheck: (packages: string) =>
    `Could not check ${packages || "library versions"}; try again later.`,
  exactOnly: "Only libraries with an exact observed version can be checked.",
  published: "Published",
  notFound: "Not found",
  expired: " (expired)",
  noSecurityTxt: "No /.well-known/security.txt with a Contact field.",
};
type Messages = typeof en;
const MESSAGES: Localized<Messages> = {
  en,
  ko: {
    categories: {
      Transport: "전송",
      "Content Security Policy": "Content Security Policy",
      Headers: "헤더",
      Cookies: "쿠키",
      Content: "콘텐츠",
      Dependencies: "의존성",
      Disclosure: "정보 노출",
    },
    sections: {
      "TLS and certificate": "TLS와 인증서",
      "Security headers": "보안 헤더",
      "Content Security Policy": "Content Security Policy",
      Cookies: "쿠키",
      "Third-party scripts": "서드파티 스크립트",
      "Known vulnerabilities": "알려진 취약점",
      "security.txt": "security.txt",
    },
    search: "이슈 검색",
    searchPlaceholder: "제목, 근거, 패키지, advisory",
    sortBy: "정렬",
    bySeverity: "심각도: 높은 순",
    byTitle: "제목순",
    severity: "심각도",
    category: "분류",
    all: (count) => `전체 (${count})`,
    shown: (shown, total) => `이슈 ${total}개 중 ${shown}개`,
    reset: "필터 초기화",
    evidence: "근거",
    why: "중요한 이유",
    fix: "해결 방법",
    noMatch: "필터와 일치하는 이슈가 없습니다.",
    noIssues: "이 passive 점검에서 이슈를 찾지 못했습니다.",
    yes: "예",
    no: "아니요",
    title: "보안 검토",
    caption: "Passive · 응답, 불러온 리소스, advisory",
    scope:
      "스캐너가 가져온 응답, 브라우저에서 페이지가 불러온 리소스, 관측된 라이브러리 버전에 대한 OSV.dev advisory, security.txt를 바탕으로 합니다. 공격 payload, 경로 추측, 로그인 시도를 보내지 않았으므로 확인된 exploit이 아니라 설정상 약점과 알려진 advisory입니다.",
    evidenceNav: "보안 근거",
    inspect: "근거 살펴보기",
    chainVerified: "인증서 체인 검증됨",
    chainUnverified: "인증서 체인 검증 안 됨",
    plainHttp: "일반 HTTP",
    protocol: "프로토콜",
    cipher: "Cipher",
    subject: "Subject",
    issuer: "발급자",
    names: "이름",
    validUntil: "유효 기한",
    daysLeft: (days) => ` (${days}일 남음)`,
    notHttps: "페이지가 HTTPS로 제공되지 않았습니다.",
    headersSent: (sent, total) => `${total}개 중 ${sent}개 전송`,
    missing: "없음",
    reportOnly: "Report-only",
    enforced: "적용 중",
    notSet: "설정 안 됨",
    noSources: "(source 없음)",
    noPolicy: "정책을 보내지 않았습니다.",
    cookiesSet: (count) => `${count}개 설정 · 값은 저장하지 않음`,
    name: "이름",
    lifetime: "수명",
    persistent: "영구",
    session: "세션",
    noCookies: "응답이 쿠키를 설정하지 않았습니다.",
    origins: (count) => `origin ${count}개`,
    scripts: (count, withIntegrity) =>
      `스크립트 ${count}개 · integrity 있음 ${withIntegrity}개`,
    noThirdParty: "다른 사이트에서 불러오는 스크립트가 없습니다.",
    packagesChecked: (count) => `OSV.dev에서 패키지 ${count}개 확인`,
    osvUnavailable: "OSV.dev 조회 불가",
    noVersions: "정확한 라이브러리 버전을 관측하지 못함",
    package: "패키지",
    advisory: "Advisory",
    fixedIn: "수정 버전",
    noAdvisories: (packages) => `advisory 없음: ${packages}`,
    couldNotCheck: (packages) =>
      `확인하지 못했습니다${packages ? ` (${packages})` : ""}. 나중에 다시 시도하세요.`,
    exactOnly: "정확한 버전이 관측된 라이브러리만 확인할 수 있습니다.",
    published: "게시됨",
    notFound: "찾지 못함",
    expired: " (만료됨)",
    noSecurityTxt: "Contact 필드가 있는 /.well-known/security.txt가 없습니다.",
  },
};

function date(value: string | null, locale: Locale) {
  return value
    ? new Date(value).toLocaleDateString(locale, { dateStyle: "medium" })
    : "—";
}

function Issues({ security }: { security: SecurityReport }) {
  const t = useMessages(MESSAGES);
  const labels = useMessages(SECURITY_SEVERITY_LABELS);
  const [severities, setSeverities] = useState<Set<SecuritySeverity>>(
    () => new Set(SEVERITIES),
  );
  const [category, setCategory] = useState<SecurityCategory | "All">("All");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("severity");
  const [expanded, setExpanded] = useState<string | null>(null);
  const shown = useMemo(
    () =>
      security.issues
        .filter(
          (issue) =>
            severities.has(issue.severity) &&
            (category === "All" || issue.category === category) &&
            [
              issue.title,
              issue.evidence,
              issue.impact,
              issue.fix,
              issue.category,
              t.categories[issue.category],
              ...issue.references.map((reference) => reference.label),
            ]
              .join(" ")
              .toLowerCase()
              .includes(query.trim().toLowerCase()),
        )
        .sort((a, b) =>
          sort === "title"
            ? a.title.localeCompare(b.title)
            : SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity) ||
              a.title.localeCompare(b.title),
        ),
    [security.issues, severities, category, query, sort, t],
  );
  const count = (severity: SecuritySeverity) =>
    security.issues.filter((issue) => issue.severity === severity).length;
  const categoryCount = (name: SecurityCategory) =>
    security.issues.filter((issue) => issue.category === name).length;
  const reset = () => {
    setQuery("");
    setCategory("All");
    setSeverities(new Set(SEVERITIES));
    setSort("severity");
  };
  return (
    <>
      <div className="security-search">
        <label>
          {t.search}
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.searchPlaceholder}
          />
        </label>
        <label className="category-filter">
          {t.sortBy}
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="severity">{t.bySeverity}</option>
            <option value="title">{t.byTitle}</option>
          </select>
        </label>
      </div>
      <div className="security-filters">
        <div role="group" aria-label={t.severity}>
          {SEVERITIES.map((severity) => (
            <button
              key={severity}
              className={`severity-toggle ${severity}`}
              aria-pressed={severities.has(severity)}
              onClick={() =>
                setSeverities((current) => {
                  const next = new Set(current);
                  if (next.has(severity)) next.delete(severity);
                  else next.add(severity);
                  return next;
                })
              }
            >
              <span className="severity-name">{labels[severity]}</span>
              <strong>{count(severity)}</strong>
            </button>
          ))}
        </div>
        <label className="category-filter">
          {t.category}
          <select
            aria-label={t.category}
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as SecurityCategory | "All")
            }
          >
            <option value="All">{t.all(security.issues.length)}</option>
            {CATEGORIES.filter(categoryCount).map((name) => (
              <option key={name} value={name}>
                {t.categories[name]} ({categoryCount(name)})
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="security-result-count">
        <p role="status">{t.shown(shown.length, security.issues.length)}</p>
        <button className="secondary-button" onClick={reset}>
          {t.reset}
        </button>
      </div>
      <div className="findings-list security-issues">
        {shown.map((issue) => (
          <div className="finding" key={issue.id}>
            <button
              className="finding-trigger"
              aria-expanded={expanded === issue.id}
              aria-controls={`issue-${issue.id}`}
              onClick={() =>
                setExpanded(expanded === issue.id ? null : issue.id)
              }
            >
              <span className={`severity security-${issue.severity}`}>
                {labels[issue.severity]}
              </span>
              <span className="finding-title">{issue.title}</span>
              <span className="finding-tag">
                {t.categories[issue.category]}
              </span>
              <ChevronDown
                size={15}
                className={expanded === issue.id ? "rotated" : ""}
              />
            </button>
            {expanded === issue.id && (
              <div className="finding-content" id={`issue-${issue.id}`}>
                <div>
                  <h3>{t.evidence}</h3>
                  <p className="security-evidence">{issue.evidence}</p>
                </div>
                <div>
                  <h3>{t.why}</h3>
                  <p>{issue.impact}</p>
                </div>
                <div>
                  <h3>{t.fix}</h3>
                  <p>{issue.fix}</p>
                  {issue.references.length > 0 && (
                    <ul className="security-references">
                      {issue.references.map((reference) => (
                        <li key={reference.url}>
                          <a
                            href={reference.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {reference.label}
                            <ExternalLink size={12} aria-hidden="true" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {shown.length === 0 && (
          <p className="empty-note">
            {security.issues.length ? t.noMatch : t.noIssues}
          </p>
        )}
      </div>
    </>
  );
}

function Detail({
  section,
  caption,
  children,
}: {
  section: EvidenceSection;
  caption?: string;
  children: React.ReactNode;
}) {
  const title = useMessages(MESSAGES).sections[section];
  return (
    <section
      className="security-detail"
      id={evidenceId(section)}
      tabIndex={-1}
      aria-label={title}
    >
      <h3 className="subheading">
        {title}
        {caption && <span>{caption}</span>}
      </h3>
      {children}
    </section>
  );
}

function Rows({
  rows,
}: {
  rows: readonly (readonly [string, React.ReactNode])[];
}) {
  return (
    <table className="header-table security-table">
      <tbody>
        {rows.map(([name, value]) => (
          <tr key={name}>
            <th scope="row">{name}</th>
            <td>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const yes = (value: boolean, t: Messages) => (
  <span className={value ? "green-text" : "amber"}>{value ? t.yes : t.no}</span>
);

/** Passive security review of a live scan: issues plus the evidence behind them. */
export function SecurityExplorer({ security }: { security: SecurityReport }) {
  const t = useMessages(MESSAGES);
  const severities = useMessages(SECURITY_SEVERITY_LABELS);
  const locale = useLocale();
  const { tls, csp, cookies, thirdPartyScripts, dependencyCheck } = security;
  const [now] = useState(() => Date.now());
  const expiresIn = tls?.certificate?.validTo
    ? Math.floor((Date.parse(tls.certificate.validTo) - now) / DAY)
    : null;
  return (
    <section className="security-explorer">
      <SectionHeading title={t.title}>
        <span className="muted-caption">{t.caption}</span>
      </SectionHeading>
      <p className="empty-note security-scope">{t.scope}</p>
      <nav className="security-evidence-nav" aria-label={t.evidenceNav}>
        <span>{t.inspect}</span>
        {EVIDENCE_SECTIONS.map((section) => (
          <a
            key={section}
            href={`#${evidenceId(section)}`}
            onClick={() =>
              document.getElementById(evidenceId(section))?.focus()
            }
          >
            {t.sections[section]}
          </a>
        ))}
      </nav>
      <Issues security={security} />
      <div className="security-details">
        <Detail
          section="TLS and certificate"
          caption={
            tls
              ? tls.authorized
                ? t.chainVerified
                : t.chainUnverified
              : t.plainHttp
          }
        >
          {tls ? (
            <Rows
              rows={[
                [t.protocol, tls.protocol ?? "—"],
                [t.cipher, tls.cipher ?? "—"],
                [t.subject, tls.certificate?.subject ?? "—"],
                [t.issuer, tls.certificate?.issuer ?? "—"],
                [t.names, tls.certificate?.names.join(", ") || "—"],
                [
                  t.validUntil,
                  `${date(tls.certificate?.validTo ?? null, locale)}${
                    expiresIn === null ? "" : t.daysLeft(formatCount(expiresIn))
                  }`,
                ],
              ]}
            />
          ) : (
            <p className="empty-note">{t.notHttps}</p>
          )}
        </Detail>
        <Detail
          section="Security headers"
          caption={t.headersSent(
            security.headers.filter(({ value }) => value).length,
            security.headers.length,
          )}
        >
          <Rows
            rows={security.headers.map(({ name, value }) => [
              name,
              value === null ? (
                <span className="amber">{t.missing}</span>
              ) : (
                <LongValue value={value} />
              ),
            ])}
          />
        </Detail>
        <Detail
          section="Content Security Policy"
          caption={
            csp ? (csp.reportOnly ? t.reportOnly : t.enforced) : t.notSet
          }
        >
          {csp ? (
            <Rows
              rows={csp.directives.map(({ name, values }) => [
                name,
                values.length ? (
                  <LongValue value={values.join(" ")} />
                ) : (
                  t.noSources
                ),
              ])}
            />
          ) : (
            <p className="empty-note">{t.noPolicy}</p>
          )}
        </Detail>
        <Detail section="Cookies" caption={t.cookiesSet(cookies.length)}>
          {cookies.length ? (
            <table className="header-table security-table cookie-table">
              <thead>
                <tr>
                  <th scope="col">{t.name}</th>
                  <th scope="col">Secure</th>
                  <th scope="col">HttpOnly</th>
                  <th scope="col">SameSite</th>
                  <th scope="col">{t.lifetime}</th>
                </tr>
              </thead>
              <tbody>
                {cookies.map((cookie) => (
                  <tr key={cookie.name}>
                    <th scope="row">{cookie.name}</th>
                    <td data-label="Secure">{yes(cookie.secure, t)}</td>
                    <td data-label="HttpOnly">{yes(cookie.httpOnly, t)}</td>
                    <td data-label="SameSite">
                      {cookie.sameSite ?? (
                        <span className="amber">{t.notSet}</span>
                      )}
                    </td>
                    <td data-label={t.lifetime}>
                      {cookie.persistent ? t.persistent : t.session}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-note">{t.noCookies}</p>
          )}
        </Detail>
        <Detail
          section="Third-party scripts"
          caption={t.origins(thirdPartyScripts.length)}
        >
          {thirdPartyScripts.length ? (
            <Rows
              rows={thirdPartyScripts.map(
                ({ origin, count, withIntegrity }) => [
                  origin,
                  t.scripts(count, withIntegrity),
                ],
              )}
            />
          ) : (
            <p className="empty-note">{t.noThirdParty}</p>
          )}
        </Detail>
        <Detail
          section="Known vulnerabilities"
          caption={
            dependencyCheck.status === "checked"
              ? t.packagesChecked(dependencyCheck.checked.length)
              : dependencyCheck.status === "unavailable"
                ? t.osvUnavailable
                : t.noVersions
          }
        >
          {security.vulnerabilities.length ? (
            <table className="header-table security-table">
              <thead>
                <tr>
                  <th scope="col">{t.package}</th>
                  <th scope="col">{t.advisory}</th>
                  <th scope="col">{t.severity}</th>
                  <th scope="col">{t.fixedIn}</th>
                </tr>
              </thead>
              <tbody>
                {security.vulnerabilities.map((entry) => (
                  <tr key={`${entry.packageName}-${entry.id}`}>
                    <th scope="row">
                      {entry.packageName}@{entry.version}
                    </th>
                    <td>
                      <a href={entry.url} target="_blank" rel="noreferrer">
                        {entry.aliases.find((alias) =>
                          alias.startsWith("CVE-"),
                        ) ?? entry.id}
                      </a>
                      {entry.summary && (
                        <span className="advisory-summary">
                          {entry.summary}
                        </span>
                      )}
                    </td>
                    <td>{severities[entry.severity]}</td>
                    <td>{entry.fixed ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-note">
              {dependencyCheck.status === "checked"
                ? t.noAdvisories(dependencyCheck.checked.join(", "))
                : dependencyCheck.status === "unavailable"
                  ? t.couldNotCheck(dependencyCheck.checked.join(", "))
                  : t.exactOnly}
            </p>
          )}
        </Detail>
        <Detail
          section="security.txt"
          caption={security.securityTxt ? t.published : t.notFound}
        >
          {security.securityTxt ? (
            <Rows
              rows={[
                ["Contact", security.securityTxt.contact.join(", ")],
                [
                  "Expires",
                  security.securityTxt.expires
                    ? `${date(security.securityTxt.expires, locale)}${security.securityTxt.expired ? t.expired : ""}`
                    : "—",
                ],
                ["Policy", security.securityTxt.policy ?? "—"],
              ]}
            />
          ) : (
            <p className="empty-note">{t.noSecurityTxt}</p>
          )}
        </Detail>
      </div>
    </section>
  );
}
