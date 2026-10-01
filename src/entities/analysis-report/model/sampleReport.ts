import type { AnalysisReport, AuditCheck, Technology, Finding } from "./types";
export const SAMPLE_TECHNOLOGIES: readonly Technology[] = [
  {
    name: "Next.js",
    version: "14.2.3",
    type: "Framework",
    evidence: "/_next/static resource paths",
    basis: "Observed",
  },
  {
    name: "React",
    version: "18.3.1",
    type: "UI library",
    evidence: "React runtime markers",
    basis: "Observed",
  },
  {
    name: "TypeScript",
    version: "",
    type: "Language",
    evidence:
      "Source map naming; this does not prove the original source language.",
    basis: "Inferred",
  },
  {
    name: "Vercel",
    version: "",
    type: "Hosting",
    evidence: "x-vercel-id response header",
    basis: "Observed",
  },
  {
    name: "Cloudflare",
    version: "",
    type: "CDN / DNS",
    evidence: "cf-ray response header",
    basis: "Observed",
  },
  {
    name: "Sentry",
    version: "7.x",
    type: "Monitoring",
    evidence: "Sentry ingestion request",
    basis: "Observed",
  },
];
export const SAMPLE_FINDINGS: readonly Finding[] = [
  {
    severity: "warning",
    title: "JavaScript payload could be smaller",
    detail:
      "The initial JavaScript transfer is 486 kB. The largest chunk, main-app.js, accounts for 214 kB.",
    why: "Larger payloads take longer to download, parse, and execute on slower devices.",
    fix: "Split route-specific code and defer nonessential third-party scripts.",
    tag: "Performance",
  },
  {
    severity: "warning",
    title: "3 images are missing explicit dimensions",
    detail:
      "Three image elements have no width and height attributes in this sample document.",
    why: "The browser cannot reserve space before these images load, which can cause layout shifts.",
    fix: "Set intrinsic width and height, or use a stable CSS aspect-ratio.",
    tag: "Accessibility",
  },
  {
    severity: "info",
    title: "Content Security Policy is not configured",
    detail:
      "No Content-Security-Policy response header was present in the sample response.",
    why: "A content security policy limits which resources and scripts the browser can execute.",
    fix: "Start with a report-only policy and restrict script and resource origins.",
    tag: "Security",
  },
];

const check = (
  area: AuditCheck["area"],
  name: string,
  status: AuditCheck["status"],
  detail: string,
): AuditCheck => ({ area, name, status, detail });
export const SAMPLE_CHECKS: readonly AuditCheck[] = [
  check("Security", "HTTPS", "Passed", "Encrypted transport detected"),
  check(
    "Security",
    "Strict-Transport-Security",
    "Passed",
    "max-age=63072000; includeSubDomains",
  ),
  check("Security", "X-Content-Type-Options", "Passed", "nosniff"),
  check(
    "Security",
    "Content-Security-Policy",
    "Review",
    "Header absent from sample response",
  ),
  check(
    "Accessibility",
    "Document language",
    "Passed",
    'The document declares lang="en"',
  ),
  check(
    "Accessibility",
    "Image dimensions",
    "Review",
    "3 images lack explicit dimensions",
  ),
  check(
    "Accessibility",
    "Landmark structure",
    "Passed",
    "Header, navigation, and main landmarks present",
  ),
  check(
    "Accessibility",
    "Manual testing",
    "Manual",
    "Keyboard and assistive technology testing is still needed",
  ),
  check("SEO", "Page title", "Passed", "A descriptive title is present"),
  check(
    "SEO",
    "Meta description",
    "Passed",
    "Description is within a readable length",
  ),
  check(
    "SEO",
    "Canonical URL",
    "Passed",
    "A self-referencing canonical URL is present",
  ),
  check(
    "SEO",
    "Robots directives",
    "Passed",
    "The sample page allows indexing",
  ),
];

export function createSampleReport(domain: string): AnalysisReport {
  return {
    domain,
    mode: "sample",
    notice: "Illustrative sample; no live website scan performed.",
    technologies: SAMPLE_TECHNOLOGIES,
    findings: SAMPLE_FINDINGS,
    checks: SAMPLE_CHECKS,
  };
}
