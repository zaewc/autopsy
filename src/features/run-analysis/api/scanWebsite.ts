import {
  auditDocument,
  detectTechnologies,
  runtimeProbe,
  type AnalysisReport,
  type BrowserObservation,
  type RenderedSignals,
  type ScannedDocument,
} from "@/entities/analysis-report";
import {
  fetchPublicDocument,
  PublicFetchError,
  type FetchFailure,
  type PublicDocument,
} from "@/shared/lib/public-http/index.server";
import {
  renderPage,
  RenderError,
} from "@/shared/lib/rendered-page/index.server";
import { normalizeHttpUrl } from "@/shared/lib/web-url";
import { reviewSecurity } from "./reviewSecurity";
import { testFixtureOptions } from "./testFixture";

export type ScanFailure = FetchFailure | "not-html";

export class ScanError extends Error {
  constructor(
    readonly code: ScanFailure,
    message: string,
  ) {
    super(message);
    this.name = "ScanError";
  }
}

function countResources(html: string): ScannedDocument["resources"] {
  const count = (pattern: RegExp) => html.match(pattern)?.length ?? 0;
  return {
    scripts: count(/<script\b[^>]*\bsrc\s*=/gi),
    stylesheets: count(
      /<link\b(?=[^>]*\brel\s*=\s*["']?[^"'>]*\bstylesheet\b)[^>]*>/gi,
    ),
    images: count(/<img\b/gi),
  };
}

/** Cookie values are the visitor's session data, not technical evidence. */
function publicHeaders(headers: PublicDocument["headers"]) {
  const result = { ...headers };
  if (result["set-cookie"])
    result["set-cookie"] =
      `${result["set-cookie"].split(/,(?=\s*[^;,=\s]+=)/).length} cookie(s); values omitted`;
  return result;
}

function notice(document: PublicDocument, browserIssue: string | null) {
  const parts = browserIssue
    ? [
        `Browser stage unavailable: ${browserIssue} Results come from the HTML response only; scripts were not executed, so client-rendered technologies and browser metrics are not included.`,
      ]
    : [
        "The autopsy server fetched the HTML response and loaded the page in headless Chromium with scripts running. Timings are lab values from that server (desktop viewport, no throttling); interaction latency is not measured. Security, accessibility, and SEO checks read the HTML response.",
      ];
  if (document.status < 200 || document.status >= 300)
    parts.push(
      `The site answered with HTTP ${document.status}; results describe that response, which may be an error or bot-protection page rather than the site itself.`,
    );
  if (document.truncated)
    parts.push(
      `Only the first ${Math.round(document.bytes / 1000)} kB of the HTML document were inspected.`,
    );
  return parts.join(" ");
}

/** Deployments without Chromium can turn the browser stage off. */
const browserEnabled = () => process.env.AUTOPSY_BROWSER_SCAN !== "0";

async function observeInBrowser(
  url: string,
  signal: AbortSignal | undefined,
): Promise<
  | { rendered: RenderedSignals; browser: BrowserObservation; issue: null }
  | { rendered: null; browser: null; issue: string }
> {
  if (!browserEnabled())
    return {
      rendered: null,
      browser: null,
      issue: "It is turned off on this server.",
    };
  try {
    const page = await renderPage(url, {
      probe: runtimeProbe,
      signal,
      network: testFixtureOptions(),
    });
    return {
      rendered: {
        html: page.html,
        requests: page.requests.map((request) => request.url),
        runtime: page.probe,
      },
      browser: {
        url: page.url,
        vitals: page.vitals,
        requests: page.requests,
        requestsTruncated: page.requestsTruncated,
        consoleErrors: page.consoleErrors,
        blocked: page.blocked,
      },
      issue: null,
    };
  } catch (error) {
    if (signal?.aborted)
      throw new ScanError("aborted", "The scan was cancelled.");
    return {
      rendered: null,
      browser: null,
      issue:
        error instanceof RenderError
          ? error.message
          : "The page could not be loaded in the browser.",
    };
  }
}

/**
 * Fetch a public website, load it in a browser when possible, and analyze its
 * response, rendered page, and network activity.
 */
export async function scanWebsite(
  input: string,
  { signal }: { signal?: AbortSignal } = {},
): Promise<AnalysisReport> {
  const target = normalizeHttpUrl(input);
  if (!target)
    throw new ScanError(
      "invalid-url",
      "Enter a valid website URL, such as example.com.",
    );
  let document: PublicDocument;
  try {
    document = await fetchPublicDocument(target, {
      signal,
      ...testFixtureOptions(),
    });
  } catch (error) {
    if (error instanceof PublicFetchError)
      throw new ScanError(error.code, error.message);
    throw error;
  }
  const contentType = document.headers["content-type"] ?? "";
  if (contentType && !/html/i.test(contentType))
    throw new ScanError(
      "not-html",
      `The URL returned ${contentType.split(";")[0]}, not an HTML document.`,
    );
  const signals = { headers: document.headers, html: document.body };
  const { checks, findings } = auditDocument({ url: document.url, ...signals });
  const observed = await observeInBrowser(document.url, signal);
  const technologies = detectTechnologies({
    ...signals,
    rendered: observed.rendered,
  });
  const security = await reviewSecurity({
    document,
    technologies,
    rendered: observed.rendered,
    browser: observed.browser,
    signal,
  });
  return {
    mode: "live",
    domain: target.hostname,
    url: document.url,
    scannedAt: new Date().toISOString(),
    notice: notice(document, observed.issue),
    technologies,
    findings,
    checks,
    document: {
      status: document.status,
      contentType,
      responseMs: document.responseMs,
      bytes: document.bytes,
      truncated: document.truncated,
      redirects: document.redirects,
      headers: publicHeaders(document.headers),
      resources: countResources(document.body),
    },
    browser: observed.browser,
    security,
  };
}
