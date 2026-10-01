import {
  auditDocument,
  detectTechnologies,
  type AnalysisReport,
  type ScannedDocument,
} from "@/entities/analysis-report";
import {
  fetchPublicDocument,
  isPublicAddress,
  PublicFetchError,
  type FetchOptions,
  type FetchFailure,
  type PublicDocument,
} from "@/shared/lib/public-http/index.server";
import { normalizeHttpUrl } from "@/shared/lib/web-url";

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

function notice(document: PublicDocument) {
  const parts = [
    "Static inspection of one HTTP response fetched by the autopsy server. Scripts were not executed, so client-rendered technologies and browser metrics are not included.",
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

/**
 * Browser tests scan a fixture server on this loopback port. Never set it in a
 * deployment: it lets the scanner reach 127.0.0.1 on that port.
 */
function testFixtureOptions(): FetchOptions {
  const port = process.env.AUTOPSY_SCAN_FIXTURE_PORT;
  if (!port) return {};
  return {
    isAllowedAddress: (address) =>
      address === "127.0.0.1" || isPublicAddress(address),
    allowedPorts: ["80", "443", port],
  };
}

/** Fetch a public website once and analyze its document and headers. */
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
  return {
    mode: "live",
    domain: target.hostname,
    url: document.url,
    scannedAt: new Date().toISOString(),
    notice: notice(document),
    technologies: detectTechnologies(signals),
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
  };
}
