import type { Finding, SecurityIssue } from "../model/types";

/**
 * Security issues worth listing among findings: high and medium become
 * warnings, low stays informational, and info-level notes stay in the
 * Security view only.
 */
export function securityFindings(issues: readonly SecurityIssue[]): Finding[] {
  return issues
    .filter(({ severity }) => severity !== "info")
    .map((issue) => ({
      severity:
        issue.severity === "high" || issue.severity === "medium"
          ? "warning"
          : "info",
      title: issue.title,
      detail: issue.evidence,
      why: issue.impact,
      fix: issue.fix,
      tag: "Security",
    }));
}
