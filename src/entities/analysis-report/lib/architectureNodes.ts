import type { Locale, Localized } from "@/shared/lib/i18n";
import type { AnalysisReport, Technology } from "../model/types";

export type ArchitectureRole =
  "client" | "edge" | "hosting" | "server" | "application" | "unknown";
export interface ArchitectureNode {
  name: string;
  label: string;
  role: ArchitectureRole;
  basis: "Observed" | "Inferred" | "Unknown";
  evidence: string;
}

const en = {
  labels: {
    client: "Client",
    edge: "Edge / CDN",
    hosting: "Hosting",
    server: "Web server",
    application: "Application",
    inferred: "Inferred",
    unknown: "Unknown",
  },
  sample: {
    browser: "Browser",
    browserEvidence:
      "Observed in this sample: document, script, stylesheet, image, and font requests originate in the browser.",
    edgeEvidence:
      "Observed in this sample: a cf-ray response header indicates Cloudflare handled the public response.",
    applicationEvidence:
      "Observed in this sample: /_next/static resource paths identify the public application framework. Its private hosting topology is unknown.",
    api: "External API",
    apiEvidence:
      "Inferred only: client integration signals suggest an external service. Its server, database, and internal topology cannot be determined from this sample.",
  },
  request: "Request",
  requestEvidence: (url: string) =>
    `The autopsy server requested ${url} as a client would. Only that response is represented here.`,
  origin: "Origin services",
  originEvidence:
    "Databases, internal APIs, and private servers are not visible in a public HTTP response, so nothing is claimed about them.",
};
const MESSAGES: Localized<typeof en> = {
  en,
  ko: {
    labels: {
      client: "클라이언트",
      edge: "Edge / CDN",
      hosting: "호스팅",
      server: "웹 서버",
      application: "애플리케이션",
      inferred: "추론",
      unknown: "알 수 없음",
    },
    sample: {
      browser: "브라우저",
      browserEvidence:
        "이 샘플에서 관측: document, script, stylesheet, image, font 요청이 브라우저에서 시작됩니다.",
      edgeEvidence:
        "이 샘플에서 관측: cf-ray 응답 헤더는 Cloudflare가 공개 응답을 처리했음을 나타냅니다.",
      applicationEvidence:
        "이 샘플에서 관측: /_next/static 리소스 경로로 공개 애플리케이션 framework를 식별합니다. 비공개 호스팅 토폴로지는 알 수 없습니다.",
      api: "외부 API",
      apiEvidence:
        "추론일 뿐입니다: 클라이언트 연동 신호로 보아 외부 서비스가 있는 것으로 보입니다. 그 서버, 데이터베이스, 내부 토폴로지는 이 샘플로 알 수 없습니다.",
    },
    request: "요청",
    requestEvidence: (url) =>
      `autopsy 서버가 클라이언트처럼 ${url}을 요청했습니다. 여기에는 그 응답만 나타냅니다.`,
    origin: "Origin 서비스",
    originEvidence:
      "데이터베이스, 내부 API, 비공개 서버는 공개 HTTP 응답에 드러나지 않으므로 아무것도 단정하지 않습니다.",
  },
};

function sampleNodes(t: typeof en): ArchitectureNode[] {
  return [
    {
      name: t.sample.browser,
      label: t.labels.client,
      role: "client",
      basis: "Observed",
      evidence: t.sample.browserEvidence,
    },
    {
      name: "Cloudflare",
      label: t.labels.edge,
      role: "edge",
      basis: "Observed",
      evidence: t.sample.edgeEvidence,
    },
    {
      name: "Next.js",
      label: t.labels.application,
      role: "application",
      basis: "Observed",
      evidence: t.sample.applicationEvidence,
    },
    {
      name: t.sample.api,
      label: t.labels.inferred,
      role: "unknown",
      basis: "Inferred",
      evidence: t.sample.apiEvidence,
    },
  ];
}

const LAYERS: readonly {
  role: Exclude<ArchitectureRole, "client" | "unknown">;
  types: readonly string[];
}[] = [
  { role: "edge", types: ["CDN", "Cache"] },
  { role: "hosting", types: ["Hosting"] },
  { role: "server", types: ["Web server"] },
  {
    role: "application",
    types: ["Framework", "CMS", "Site generator", "Site builder", "Commerce"],
  },
];

function layerNode(
  role: ArchitectureRole,
  label: string,
  technologies: readonly Technology[],
): ArchitectureNode {
  return {
    name: technologies.map(({ name }) => name).join(", "),
    label,
    role,
    basis: "Observed",
    evidence: technologies
      .map(({ name, evidence }) => `${name}: ${evidence}`)
      .join(" "),
  };
}

/**
 * The request path a report supports. Live reports only draw layers with an
 * observed signal and end at an explicitly unknown origin.
 */
export function architectureNodes(
  report: AnalysisReport,
  locale: Locale = "en",
): ArchitectureNode[] {
  const t = MESSAGES[locale];
  if (report.mode === "sample") return sampleNodes(t);
  const observed = report.technologies.filter(
    ({ basis }) => basis === "Observed",
  );
  const layers = LAYERS.flatMap(({ role, types }) => {
    const matches = observed.filter(({ type }) => types.includes(type));
    return matches.length ? [layerNode(role, t.labels[role], matches)] : [];
  });
  return [
    {
      name: t.request,
      label: t.labels.client,
      role: "client",
      basis: "Observed",
      evidence: t.requestEvidence(report.url),
    },
    ...layers,
    {
      name: t.origin,
      label: t.labels.unknown,
      role: "unknown",
      basis: "Unknown",
      evidence: t.originEvidence,
    },
  ];
}
