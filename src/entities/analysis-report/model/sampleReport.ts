import type { Locale, Localized } from "@/shared/lib/i18n";
import type { AnalysisReport, AuditCheck, Technology, Finding } from "./types";

interface SampleText {
  evidence: {
    next: string;
    react: string;
    typescript: string;
    vercel: string;
    cloudflare: string;
    sentry: string;
  };
  findings: readonly Finding[];
  checks: Readonly<
    Record<
      | "https"
      | "csp"
      | "language"
      | "dimensions"
      | "landmarks"
      | "manual"
      | "title"
      | "description"
      | "canonical"
      | "robots",
      readonly [name: string, detail: string]
    >
  >;
  notice: string;
}

const TEXT: Localized<SampleText> = {
  en: {
    evidence: {
      next: "/_next/static resource paths",
      react: "React runtime markers",
      typescript:
        "Source map naming; this does not prove the original source language.",
      vercel: "x-vercel-id response header",
      cloudflare: "cf-ray response header",
      sentry: "Sentry ingestion request",
    },
    findings: [
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
    ],
    checks: {
      https: ["HTTPS", "Encrypted transport detected"],
      csp: ["Content-Security-Policy", "Header absent from sample response"],
      language: ["Document language", 'The document declares lang="en"'],
      dimensions: ["Image dimensions", "3 images lack explicit dimensions"],
      landmarks: [
        "Landmark structure",
        "Header, navigation, and main landmarks present",
      ],
      manual: [
        "Manual testing",
        "Keyboard and assistive technology testing is still needed",
      ],
      title: ["Page title", "A descriptive title is present"],
      description: [
        "Meta description",
        "Description is within a readable length",
      ],
      canonical: [
        "Canonical URL",
        "A self-referencing canonical URL is present",
      ],
      robots: ["Robots directives", "The sample page allows indexing"],
    },
    notice: "Illustrative sample; no live website scan performed.",
  },
  ko: {
    evidence: {
      next: "/_next/static 리소스 경로",
      react: "React runtime 표식",
      typescript:
        "Source map 이름으로 추론했으며, 원래 소스 언어를 증명하지는 않습니다.",
      vercel: "x-vercel-id 응답 헤더",
      cloudflare: "cf-ray 응답 헤더",
      sentry: "Sentry 수집 요청",
    },
    findings: [
      {
        severity: "warning",
        title: "JavaScript payload를 줄일 수 있습니다",
        detail:
          "초기 JavaScript 전송량은 486 kB입니다. 가장 큰 chunk인 main-app.js가 214 kB를 차지합니다.",
        why: "payload가 클수록 느린 기기에서 다운로드, 파싱, 실행에 시간이 더 걸립니다.",
        fix: "라우트별 코드를 분리하고 꼭 필요하지 않은 서드파티 스크립트를 지연 로드하세요.",
        tag: "Performance",
      },
      {
        severity: "warning",
        title: "이미지 3개에 명시적인 크기가 없습니다",
        detail:
          "이 샘플 문서의 image 요소 3개에 width와 height 속성이 없습니다.",
        why: "이미지가 로드되기 전에 브라우저가 공간을 확보할 수 없어 layout shift가 생길 수 있습니다.",
        fix: "고유 width와 height를 지정하거나 안정적인 CSS aspect-ratio를 사용하세요.",
        tag: "Accessibility",
      },
      {
        severity: "info",
        title: "Content Security Policy가 설정되지 않았습니다",
        detail: "샘플 응답에 Content-Security-Policy 응답 헤더가 없었습니다.",
        why: "Content Security Policy는 브라우저가 실행할 수 있는 리소스와 스크립트를 제한합니다.",
        fix: "report-only 정책으로 시작해 스크립트와 리소스 origin을 제한하세요.",
        tag: "Security",
      },
    ],
    checks: {
      https: ["HTTPS", "암호화된 전송을 감지했습니다"],
      csp: ["Content-Security-Policy", "샘플 응답에 헤더가 없습니다"],
      language: ["문서 언어", '문서가 lang="en"을 선언합니다'],
      dimensions: ["이미지 크기", "이미지 3개에 명시적인 크기가 없습니다"],
      landmarks: [
        "Landmark 구조",
        "header, navigation, main landmark가 있습니다",
      ],
      manual: ["수동 테스트", "키보드와 보조 기술 테스트가 여전히 필요합니다"],
      title: ["페이지 제목", "설명적인 제목이 있습니다"],
      description: ["Meta description", "설명이 읽기 좋은 길이입니다"],
      canonical: [
        "Canonical URL",
        "자기 자신을 가리키는 canonical URL이 있습니다",
      ],
      robots: ["Robots 지시어", "샘플 페이지가 색인을 허용합니다"],
    },
    notice: "예시 샘플이며 실제 웹사이트를 스캔하지 않았습니다.",
  },
};

function technologies(t: SampleText): Technology[] {
  const tech = (
    name: string,
    version: string,
    type: string,
    evidence: string,
    basis: Technology["basis"] = "Observed",
  ): Technology => ({ name, version, type, evidence, basis });
  return [
    tech("Next.js", "14.2.3", "Framework", t.evidence.next),
    tech("React", "18.3.1", "UI library", t.evidence.react),
    tech("TypeScript", "", "Language", t.evidence.typescript, "Inferred"),
    tech("Vercel", "", "Hosting", t.evidence.vercel),
    tech("Cloudflare", "", "CDN / DNS", t.evidence.cloudflare),
    tech("Sentry", "7.x", "Monitoring", t.evidence.sentry),
  ];
}

function checks({ checks: c }: SampleText): AuditCheck[] {
  const check = (
    area: AuditCheck["area"],
    [name, detail]: readonly [string, string],
    status: AuditCheck["status"] = "Passed",
  ): AuditCheck => ({ area, name, status, detail });
  return [
    check("Security", c.https),
    check("Security", [
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains",
    ]),
    check("Security", ["X-Content-Type-Options", "nosniff"]),
    check("Security", c.csp, "Review"),
    check("Accessibility", c.language),
    check("Accessibility", c.dimensions, "Review"),
    check("Accessibility", c.landmarks),
    check("Accessibility", c.manual, "Manual"),
    check("SEO", c.title),
    check("SEO", c.description),
    check("SEO", c.canonical),
    check("SEO", c.robots),
  ];
}

/** Illustrative report that is not attributed to any real website. */
export function createSampleReport(locale: Locale = "en"): AnalysisReport {
  const t = TEXT[locale];
  return {
    domain: "sample",
    mode: "sample",
    url: "",
    scannedAt: null,
    notice: t.notice,
    technologies: technologies(t),
    findings: t.findings,
    checks: checks(t),
    document: null,
    browser: null,
    security: null,
  };
}
