import {
  auditDocument,
  detectTechnologies,
  securityFindings,
  runtimeProbe,
  type AnalysisReport,
  type BrowserObservation,
  type RenderedSignals,
  type ScannedDocument,
} from "@/entities/analysis-report";
import type { Locale } from "@/shared/lib/i18n";
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
import { SCAN_MESSAGES, type ScanMessages } from "./scanMessages";
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
function publicHeaders(headers: PublicDocument["headers"], t: ScanMessages) {
  const result = { ...headers };
  if (result["set-cookie"])
    result["set-cookie"] = t.cookies(
      result["set-cookie"].split(/,(?=\s*[^;,=\s]+=)/).length,
    );
  return result;
}

function notice(
  document: PublicDocument,
  browserIssue: string | null,
  t: ScanMessages,
) {
  const parts = [
    browserIssue ? t.browserUnavailable(browserIssue) : t.browserRan,
  ];
  if (document.status < 200 || document.status >= 300)
    parts.push(t.status(document.status));
  if (document.truncated)
    parts.push(t.truncated(Math.round(document.bytes / 1000)));
  return parts.join(" ");
}

/** Deployments without Chromium can turn the browser stage off. */
const browserEnabled = () => process.env.AUTOPSY_BROWSER_SCAN !== "0";

async function observeInBrowser(
  url: string,
  signal: AbortSignal | undefined,
  t: ScanMessages,
): Promise<
  | { rendered: RenderedSignals; browser: BrowserObservation; issue: null }
  | { rendered: null; browser: null; issue: string }
> {
  if (!browserEnabled())
    return {
      rendered: null,
      browser: null,
      issue: t.browserOff,
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
    if (signal?.aborted) throw new ScanError("aborted", t.cancelled);
    return {
      rendered: null,
      browser: null,
      issue:
        error instanceof RenderError
          ? (t.renderFailure?.(error.code) ?? error.message)
          : t.browserFailed,
    };
  }
}

/**
 * Fetch a public website, load it in a browser when possible, and analyze its
 * response, rendered page, and network activity.
 */
export async function scanWebsite(
  input: string,
  { signal, locale = "en" }: { signal?: AbortSignal; locale?: Locale } = {},
): Promise<AnalysisReport> {
  const t = SCAN_MESSAGES[locale];
  const target = normalizeHttpUrl(input);
  if (!target) throw new ScanError("invalid-url", t.invalidUrl);
  let document: PublicDocument;
  try {
    document = await fetchPublicDocument(target, {
      signal,
      ...testFixtureOptions(),
    });
  } catch (error) {
    if (error instanceof PublicFetchError)
      throw new ScanError(
        error.code,
        t.fetchFailure?.(
          error.code,
          error.message.match(/\(([A-Z_]+)\)/)?.[1] ?? "",
        ) ?? error.message,
      );
    throw error;
  }
  const contentType = document.headers["content-type"] ?? "";
  if (contentType && !/html/i.test(contentType))
    throw new ScanError("not-html", t.notHtml(contentType.split(";")[0]));
  const signals = { headers: document.headers, html: document.body };
  const audit = auditDocument(signals, locale);
  const observed = await observeInBrowser(document.url, signal, t);
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
    notice: notice(document, observed.issue, t),
    technologies,
    // Warnings first; security before document checks within each severity.
    findings: [...securityFindings(security.issues), ...audit.findings].sort(
      (a, b) =>
        a.severity === b.severity ? 0 : a.severity === "warning" ? -1 : 1,
    ),
    checks: audit.checks,
    document: {
      status: document.status,
      contentType,
      responseMs: document.responseMs,
      bytes: document.bytes,
      truncated: document.truncated,
      redirects: document.redirects,
      headers: publicHeaders(document.headers, t),
      resources: countResources(document.body),
    },
    browser: observed.browser,
    security,
  };
}
