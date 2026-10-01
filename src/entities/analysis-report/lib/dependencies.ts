import type {
  KnownVulnerability,
  SecurityIssue,
  SecuritySeverity,
  Technology,
} from "../model/types";

export interface DependencyQuery {
  technology: string;
  ecosystem: "npm";
  name: string;
  version: string;
}

/** Detected technology → npm package whose versions advisories reference. */
const PACKAGES: Readonly<Record<string, string>> = {
  jQuery: "jquery",
  Bootstrap: "bootstrap",
  Angular: "@angular/core",
  React: "react",
  Vue: "vue",
  "Next.js": "next",
  Nuxt: "nuxt",
  Gatsby: "gatsby",
  Astro: "astro",
  "React Router": "react-router",
  Docusaurus: "@docusaurus/core",
  "Alpine.js": "alpinejs",
  htmx: "htmx.org",
  "Ember.js": "ember-source",
  "Moment.js": "moment",
  D3: "d3",
  "Chart.js": "chart.js",
  Leaflet: "leaflet",
  "Three.js": "three",
  GSAP: "gsap",
  Firebase: "firebase",
  Swiper: "swiper",
  Zod: "zod",
  "Apollo Client": "@apollo/client",
};

/** An exact release version, or null when the observed value is too vague. */
function exactVersion(technology: string, raw: string) {
  const version = raw.replace(/\+.*$/, "");
  // Three.js exposes its revision ("148"); npm publishes it as 0.148.0.
  if (technology === "Three.js" && /^\d+$/.test(version))
    return `0.${version}.0`;
  return /^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version) ? version : null;
}

/** Package versions to check, for observed technologies with exact versions. */
export function dependencyQueries(
  technologies: readonly Technology[],
): DependencyQuery[] {
  return technologies.flatMap(({ name, version, basis }) => {
    const pkg = PACKAGES[name];
    const exact =
      basis === "Observed" && pkg ? exactVersion(name, version) : null;
    return exact
      ? [
          {
            technology: name,
            ecosystem: "npm" as const,
            name: pkg,
            version: exact,
          },
        ]
      : [];
  });
}

const RANK: Record<SecuritySeverity, number> = {
  high: 0,
  medium: 1,
  low: 2,
  info: 3,
};

/** Map an advisory database label; unlabelled advisories count as medium. */
export function advisorySeverity(label: string | null): SecuritySeverity {
  switch (label?.toUpperCase()) {
    case "CRITICAL":
    case "HIGH":
      return "high";
    case "LOW":
      return "low";
    default:
      return "medium";
  }
}

/** One issue per vulnerable package, ranked by its worst advisory. */
export function dependencyIssues(
  vulnerabilities: readonly KnownVulnerability[],
): SecurityIssue[] {
  const byPackage = new Map<string, KnownVulnerability[]>();
  for (const vulnerability of vulnerabilities) {
    const key = `${vulnerability.technology}@${vulnerability.version}`;
    byPackage.set(key, [...(byPackage.get(key) ?? []), vulnerability]);
  }
  return [...byPackage.values()].map((found) => {
    const [{ technology, packageName, version }] = found;
    const severity = found
      .map(({ severity }) => severity)
      .sort((a, b) => RANK[a] - RANK[b])[0];
    const fixes = found
      .map(({ fixed }) => fixed)
      .filter((fixed): fixed is string => Boolean(fixed))
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    const label = (entry: KnownVulnerability) =>
      entry.aliases.find((alias) => alias.startsWith("CVE-")) ?? entry.id;
    return {
      id: `dependency-${packageName}`,
      category: "Dependencies" as const,
      severity,
      title: `${technology} ${version} has ${found.length} known vulnerabilit${found.length === 1 ? "y" : "ies"}`,
      evidence: `${packageName}@${version} matches ${found.map(label).join(", ")} in OSV.dev. The version was observed on the page.`,
      impact:
        found
          .map(({ summary }) => summary)
          .filter(Boolean)
          .slice(0, 3)
          .join(" ") ||
        "See the advisories for affected features and conditions.",
      fix: fixes.length
        ? `Upgrade ${packageName} to ${fixes[0]} or later, then confirm the affected feature is in use before prioritizing.`
        : `Upgrade ${packageName} to a release that is not listed as affected.`,
      references: found
        .slice(0, 5)
        .map((entry) => ({ label: label(entry), url: entry.url })),
    };
  });
}
