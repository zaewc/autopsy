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

const SAMPLE_NODES: readonly ArchitectureNode[] = [
  {
    name: "Browser",
    label: "Client",
    role: "client",
    basis: "Observed",
    evidence:
      "Observed in this sample: document, script, stylesheet, image, and font requests originate in the browser.",
  },
  {
    name: "Cloudflare",
    label: "Edge / CDN",
    role: "edge",
    basis: "Observed",
    evidence:
      "Observed in this sample: a cf-ray response header indicates Cloudflare handled the public response.",
  },
  {
    name: "Next.js",
    label: "Application",
    role: "application",
    basis: "Observed",
    evidence:
      "Observed in this sample: /_next/static resource paths identify the public application framework. Its private hosting topology is unknown.",
  },
  {
    name: "External API",
    label: "Inferred",
    role: "unknown",
    basis: "Inferred",
    evidence:
      "Inferred only: client integration signals suggest an external service. Its server, database, and internal topology cannot be determined from this sample.",
  },
];

const LAYERS: readonly {
  role: ArchitectureRole;
  label: string;
  types: readonly string[];
}[] = [
  { role: "edge", label: "Edge / CDN", types: ["CDN", "Cache"] },
  { role: "hosting", label: "Hosting", types: ["Hosting"] },
  { role: "server", label: "Web server", types: ["Web server"] },
  {
    role: "application",
    label: "Application",
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
export function architectureNodes(report: AnalysisReport): ArchitectureNode[] {
  if (report.mode === "sample") return [...SAMPLE_NODES];
  const observed = report.technologies.filter(
    ({ basis }) => basis === "Observed",
  );
  const layers = LAYERS.flatMap(({ role, label, types }) => {
    const matches = observed.filter(({ type }) => types.includes(type));
    return matches.length ? [layerNode(role, label, matches)] : [];
  });
  return [
    {
      name: "Request",
      label: "Client",
      role: "client",
      basis: "Observed",
      evidence: `The autopsy server requested ${report.url} as a client would. Only that response is represented here.`,
    },
    ...layers,
    {
      name: "Origin services",
      label: "Unknown",
      role: "unknown",
      basis: "Unknown",
      evidence:
        "Databases, internal APIs, and private servers are not visible in a public HTTP response, so nothing is claimed about them.",
    },
  ];
}
