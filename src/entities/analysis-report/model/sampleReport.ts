import type { AnalysisReport, Technology, Finding } from "./types";
export const SAMPLE_TECHNOLOGIES: readonly Technology[] = [
  {
    logo: "N",
    name: "Next.js",
    version: "14.2.3",
    type: "Framework",
    confidence: 99,
  },
  {
    logo: "⚛",
    name: "React",
    version: "18.3.1",
    type: "UI library",
    confidence: 99,
  },
  {
    logo: "TS",
    name: "TypeScript",
    version: "",
    type: "Language · inferred",
    confidence: 82,
  },
  { logo: "▲", name: "Vercel", version: "", type: "Hosting", confidence: 100 },
  {
    logo: "☁",
    name: "Cloudflare",
    version: "",
    type: "CDN / DNS",
    confidence: 96,
  },
  {
    logo: "◬",
    name: "Sentry",
    version: "7.x",
    type: "Monitoring",
    confidence: 94,
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

export function createSampleReport(domain: string): AnalysisReport {
  return {
    domain,
    mode: "sample",
    notice: "Illustrative sample; no live website scan performed.",
    score: 86,
    technologies: SAMPLE_TECHNOLOGIES,
    findings: SAMPLE_FINDINGS,
  };
}
