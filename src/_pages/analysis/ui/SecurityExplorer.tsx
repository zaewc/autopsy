"use client";
import { useMemo, useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import type {
  SecurityCategory,
  SecurityReport,
  SecuritySeverity,
} from "@/entities/analysis-report";
import { SectionHeading } from "@/shared/ui/section-heading";
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
const DAY = 86_400_000;

function date(value: string | null) {
  return value
    ? new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" })
    : "—";
}

function Issues({ security }: { security: SecurityReport }) {
  const [severities, setSeverities] = useState<Set<SecuritySeverity>>(
    () => new Set(SEVERITIES),
  );
  const [category, setCategory] = useState<SecurityCategory | "All">("All");
  const [expanded, setExpanded] = useState<string | null>(null);
  const shown = useMemo(
    () =>
      security.issues.filter(
        (issue) =>
          severities.has(issue.severity) &&
          (category === "All" || issue.category === category),
      ),
    [security.issues, severities, category],
  );
  const count = (severity: SecuritySeverity) =>
    security.issues.filter((issue) => issue.severity === severity).length;
  const categoryCount = (name: SecurityCategory) =>
    security.issues.filter((issue) => issue.category === name).length;
  return (
    <>
      <div className="security-filters">
        <div role="group" aria-label="Severity">
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
              <span className="severity-name">{severity}</span>
              <strong>{count(severity)}</strong>
            </button>
          ))}
        </div>
        <label className="category-filter">
          Category
          <select
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as SecurityCategory | "All")
            }
          >
            <option value="All">All ({security.issues.length})</option>
            {CATEGORIES.filter(categoryCount).map((name) => (
              <option key={name} value={name}>
                {name} ({categoryCount(name)})
              </option>
            ))}
          </select>
        </label>
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
                {issue.severity}
              </span>
              <span className="finding-title">{issue.title}</span>
              <span className="finding-tag">{issue.category}</span>
              <ChevronDown
                size={15}
                className={expanded === issue.id ? "rotated" : ""}
              />
            </button>
            {expanded === issue.id && (
              <div className="finding-content" id={`issue-${issue.id}`}>
                <div>
                  <h3>Evidence</h3>
                  <p className="security-evidence">{issue.evidence}</p>
                </div>
                <div>
                  <h3>Why it matters</h3>
                  <p>{issue.impact}</p>
                </div>
                <div>
                  <h3>How to fix</h3>
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
            {security.issues.length
              ? "No issues match these filters."
              : "No issues were found by these passive checks."}
          </p>
        )}
      </div>
    </>
  );
}

function Detail({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="security-detail">
      <div className="subheading">
        {title}
        {caption && <span>{caption}</span>}
      </div>
      {children}
    </div>
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

const yes = (value: boolean) => (
  <span className={value ? "green-text" : "amber"}>{value ? "Yes" : "No"}</span>
);

/** Passive security review of a live scan: issues plus the evidence behind them. */
export function SecurityExplorer({ security }: { security: SecurityReport }) {
  const { tls, csp, cookies, thirdPartyScripts, dependencyCheck } = security;
  const [now] = useState(() => Date.now());
  const expiresIn = tls?.certificate?.validTo
    ? Math.floor((Date.parse(tls.certificate.validTo) - now) / DAY)
    : null;
  return (
    <section className="security-explorer">
      <SectionHeading title="Security review">
        <span className="muted-caption">
          Passive · response, loaded resources, advisories
        </span>
      </SectionHeading>
      <p className="empty-note security-scope">
        Built from the response the scanner fetched, what the page loaded in the
        browser, OSV.dev advisories for observed library versions, and
        security.txt. No attack payloads, path guessing, or logins were sent, so
        these are configuration weaknesses and known advisories, not confirmed
        exploits.
      </p>
      <Issues security={security} />
      <div className="security-details">
        <Detail
          title="TLS and certificate"
          caption={
            tls
              ? tls.authorized
                ? "Chain verified"
                : "Chain not verified"
              : "Plain HTTP"
          }
        >
          {tls ? (
            <Rows
              rows={[
                ["Protocol", tls.protocol ?? "—"],
                ["Cipher", tls.cipher ?? "—"],
                ["Subject", tls.certificate?.subject ?? "—"],
                ["Issuer", tls.certificate?.issuer ?? "—"],
                ["Names", tls.certificate?.names.join(", ") || "—"],
                [
                  "Valid until",
                  `${date(tls.certificate?.validTo ?? null)}${
                    expiresIn === null
                      ? ""
                      : ` (${formatCount(expiresIn)} days left)`
                  }`,
                ],
              ]}
            />
          ) : (
            <p className="empty-note">The page was not served over HTTPS.</p>
          )}
        </Detail>
        <Detail
          title="Security headers"
          caption={`${security.headers.filter(({ value }) => value).length} of ${security.headers.length} sent`}
        >
          <Rows
            rows={security.headers.map(({ name, value }) => [
              name,
              value === null ? (
                <span className="amber">Missing</span>
              ) : (
                <LongValue value={value} />
              ),
            ])}
          />
        </Detail>
        <Detail
          title="Content Security Policy"
          caption={
            csp ? (csp.reportOnly ? "Report-only" : "Enforced") : "Not set"
          }
        >
          {csp ? (
            <Rows
              rows={csp.directives.map(({ name, values }) => [
                name,
                values.length ? (
                  <LongValue value={values.join(" ")} />
                ) : (
                  "(no sources)"
                ),
              ])}
            />
          ) : (
            <p className="empty-note">No policy was sent.</p>
          )}
        </Detail>
        <Detail
          title="Cookies"
          caption={`${cookies.length} set · values not stored`}
        >
          {cookies.length ? (
            <table className="header-table security-table cookie-table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Secure</th>
                  <th scope="col">HttpOnly</th>
                  <th scope="col">SameSite</th>
                  <th scope="col">Lifetime</th>
                </tr>
              </thead>
              <tbody>
                {cookies.map((cookie) => (
                  <tr key={cookie.name}>
                    <th scope="row">{cookie.name}</th>
                    <td data-label="Secure">{yes(cookie.secure)}</td>
                    <td data-label="HttpOnly">{yes(cookie.httpOnly)}</td>
                    <td data-label="SameSite">
                      {cookie.sameSite ?? (
                        <span className="amber">Not set</span>
                      )}
                    </td>
                    <td data-label="Lifetime">
                      {cookie.persistent ? "Persistent" : "Session"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-note">The response set no cookies.</p>
          )}
        </Detail>
        <Detail
          title="Third-party scripts"
          caption={`${thirdPartyScripts.length} origin${thirdPartyScripts.length === 1 ? "" : "s"}`}
        >
          {thirdPartyScripts.length ? (
            <Rows
              rows={thirdPartyScripts.map(
                ({ origin, count, withIntegrity }) => [
                  origin,
                  `${count} script${count === 1 ? "" : "s"} · ${withIntegrity} with integrity`,
                ],
              )}
            />
          ) : (
            <p className="empty-note">No scripts load from other sites.</p>
          )}
        </Detail>
        <Detail
          title="Known vulnerabilities"
          caption={
            dependencyCheck.status === "checked"
              ? `${dependencyCheck.checked.length} package${dependencyCheck.checked.length === 1 ? "" : "s"} checked in OSV.dev`
              : dependencyCheck.status === "unavailable"
                ? "OSV.dev lookup unavailable"
                : "No exact library versions observed"
          }
        >
          {security.vulnerabilities.length ? (
            <table className="header-table security-table">
              <thead>
                <tr>
                  <th scope="col">Package</th>
                  <th scope="col">Advisory</th>
                  <th scope="col">Severity</th>
                  <th scope="col">Fixed in</th>
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
                    <td>{entry.severity}</td>
                    <td>{entry.fixed ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-note">
              {dependencyCheck.status === "checked"
                ? `No advisories for ${dependencyCheck.checked.join(", ")}.`
                : dependencyCheck.status === "unavailable"
                  ? `Could not check ${dependencyCheck.checked.join(", ") || "library versions"}; try again later.`
                  : "Only libraries with an exact observed version can be checked."}
            </p>
          )}
        </Detail>
        <Detail
          title="security.txt"
          caption={security.securityTxt ? "Published" : "Not found"}
        >
          {security.securityTxt ? (
            <Rows
              rows={[
                ["Contact", security.securityTxt.contact.join(", ")],
                [
                  "Expires",
                  security.securityTxt.expires
                    ? `${date(security.securityTxt.expires)}${security.securityTxt.expired ? " (expired)" : ""}`
                    : "—",
                ],
                ["Policy", security.securityTxt.policy ?? "—"],
              ]}
            />
          ) : (
            <p className="empty-note">
              No /.well-known/security.txt with a Contact field.
            </p>
          )}
        </Detail>
      </div>
    </section>
  );
}
