import {
  analyzeContent,
  analyzeSecurity,
  advisorySeverity,
  dependencyIssues,
  dependencyQueries,
  parseSecurityTxt,
  securityTxtIssues,
  type BrowserObservation,
  type KnownVulnerability,
  type RenderedSignals,
  type SecurityIssue,
  type SecurityReport,
  type SecurityTxt,
  type Technology,
} from "@/entities/analysis-report";
import type { Locale } from "@/shared/lib/i18n";
import { queryOsv } from "@/shared/lib/osv/index.server";
import {
  fetchPublicDocument,
  type PublicDocument,
} from "@/shared/lib/public-http/index.server";
import { testFixtureOptions } from "./testFixture";

/** Deployments without outbound access to OSV.dev can turn the lookup off. */
const osvEnabled = () => process.env.AUTOPSY_OSV_LOOKUP !== "0";

async function knownVulnerabilities(
  technologies: readonly Technology[],
): Promise<Pick<SecurityReport, "vulnerabilities" | "dependencyCheck">> {
  const queries = dependencyQueries(technologies);
  const checked = queries.map(({ name, version }) => `${name}@${version}`);
  if (!queries.length || !osvEnabled())
    return {
      vulnerabilities: [],
      dependencyCheck: {
        checked,
        status: queries.length ? "unavailable" : "none",
      },
    };
  try {
    const results = await queryOsv(queries);
    const vulnerabilities: KnownVulnerability[] = results.flatMap(
      (found, index) =>
        found.map((entry) => ({
          technology: queries[index].technology,
          packageName: queries[index].name,
          version: queries[index].version,
          id: entry.id,
          aliases: entry.aliases,
          summary: entry.summary,
          severity: advisorySeverity(entry.severity),
          fixed: entry.fixed,
          url: entry.url,
        })),
    );
    return { vulnerabilities, dependencyCheck: { checked, status: "checked" } };
  } catch {
    return {
      vulnerabilities: [],
      dependencyCheck: { checked, status: "unavailable" },
    };
  }
}

/** One small GET for the published contact file; undefined when unreachable. */
async function securityTxt(
  origin: string,
  signal: AbortSignal | undefined,
): Promise<SecurityTxt | null | undefined> {
  const url = `${origin}/.well-known/security.txt`;
  try {
    const response = await fetchPublicDocument(url, {
      signal,
      timeoutMs: 4_000,
      maxBytes: 32_000,
      maxRedirects: 2,
      ...testFixtureOptions(),
    });
    return response.status === 200
      ? parseSecurityTxt(url, response.body)
      : null;
  } catch {
    return undefined;
  }
}

const RANK = { high: 0, medium: 1, low: 2, info: 3 } as const;

/**
 * Passive security review: the fetched response, what the page loaded,
 * advisories for observed library versions, and the security.txt file.
 */
export async function reviewSecurity({
  document,
  technologies,
  rendered,
  browser,
  signal,
  locale,
}: {
  document: PublicDocument;
  technologies: readonly Technology[];
  rendered: RenderedSignals | null;
  browser: BrowserObservation | null;
  signal?: AbortSignal;
  locale?: Locale;
}): Promise<SecurityReport> {
  const origin = new URL(document.url).origin;
  const response = analyzeSecurity({
    url: document.url,
    headers: document.headers,
    setCookies: document.setCookies,
    tls: document.tls,
    locale,
  });
  const content = analyzeContent({
    url: document.url,
    html: rendered?.html ?? document.body,
    requests: browser?.requests,
  });
  const [dependencies, contact] = await Promise.all([
    knownVulnerabilities(technologies),
    securityTxt(origin, signal),
  ]);
  const issues: SecurityIssue[] = [
    ...response.issues,
    ...content.issues,
    ...dependencyIssues(dependencies.vulnerabilities),
    ...(contact === undefined ? [] : securityTxtIssues(origin, contact)),
  ].sort((a, b) => RANK[a.severity] - RANK[b.severity]);
  return {
    issues,
    headers: response.headers,
    csp: response.csp,
    cookies: response.cookies,
    tls: response.tls,
    thirdPartyScripts: content.thirdPartyScripts,
    ...dependencies,
    securityTxt: contact ?? null,
  };
}
