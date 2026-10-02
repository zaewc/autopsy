import type { Locale, Localized } from "@/shared/lib/i18n";
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

const en = {
  title: (technology: string, version: string, count: number) =>
    `${technology} ${version} has ${count} known vulnerabilit${count === 1 ? "y" : "ies"}`,
  evidence: (pkg: string, advisories: string) =>
    `${pkg} matches ${advisories} in OSV.dev. The version was observed on the page.`,
  impact: "See the advisories for affected features and conditions.",
  upgradeTo: (name: string, fixed: string) =>
    `Upgrade ${name} to ${fixed} or later, then confirm the affected feature is in use before prioritizing.`,
  upgrade: (name: string) =>
    `Upgrade ${name} to a release that is not listed as affected.`,
};
const MESSAGES: Localized<typeof en> = {
  en,
  ko: {
    title: (technology, version, count) =>
      `${technology} ${version}에 알려진 취약점 ${count}개`,
    evidence: (pkg, advisories) =>
      `OSV.dev에서 ${pkg}가 ${advisories}에 해당합니다. 버전은 페이지에서 관측했습니다.`,
    impact: "영향받는 기능과 조건은 advisory를 확인하세요.",
    upgradeTo: (name, fixed) =>
      `${name}를 ${fixed} 이상으로 업그레이드하고, 우선순위를 정하기 전에 영향받는 기능을 실제로 쓰는지 확인하세요.`,
    upgrade: (name) =>
      `${name}를 영향받는 버전 목록에 없는 릴리스로 업그레이드하세요.`,
  },
};

/** One issue per vulnerable package, ranked by its worst advisory. Advisory summaries stay in OSV.dev's language. */
export function dependencyIssues(
  vulnerabilities: readonly KnownVulnerability[],
  locale: Locale = "en",
): SecurityIssue[] {
  const t = MESSAGES[locale];
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
      title: t.title(technology, version, found.length),
      evidence: t.evidence(
        `${packageName}@${version}`,
        found.map(label).join(", "),
      ),
      impact:
        found
          .map(({ summary }) => summary)
          .filter(Boolean)
          .slice(0, 3)
          .join(" ") || t.impact,
      fix: fixes.length
        ? t.upgradeTo(packageName, fixes[0])
        : t.upgrade(packageName),
      references: found
        .slice(0, 5)
        .map((entry) => ({ label: label(entry), url: entry.url })),
    };
  });
}
