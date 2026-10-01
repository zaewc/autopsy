import { chromium, type Browser, type Request } from "playwright-core";
import {
  startPublicProxy,
  type ProxyOptions,
} from "@/shared/lib/public-http/index.server";

export interface RenderedRequest {
  url: string;
  /** Playwright resource type: document, script, stylesheet, image, font, fetch, … */
  type: string;
  /** HTTP status, or null when the request failed. */
  status: number | null;
  /** Response body bytes as received, or 0 when unknown. */
  bytes: number;
  /** Milliseconds after the first request started. */
  startMs: number;
  /** Milliseconds until the response ended, or null when unknown. */
  durationMs: number | null;
  /** Browser error text for failed or refused requests. */
  failure: string | null;
}

export interface PageVitals {
  ttfbMs: number | null;
  fcpMs: number | null;
  lcpMs: number | null;
  cls: number | null;
}

export interface RenderedPage<T> {
  /** URL of the page after redirects and client-side navigation. */
  url: string;
  /** Serialized DOM after scripts ran. */
  html: string;
  truncated: boolean;
  requests: readonly RenderedRequest[];
  /** True when more requests were made than were recorded. */
  requestsTruncated: boolean;
  vitals: PageVitals;
  consoleErrors: number;
  /** Destinations the proxy refused (private addresses, other ports). */
  blocked: readonly string[];
  /** Result of the caller's in-page probe. */
  probe: T;
}

export type RenderFailure =
  "unavailable" | "blocked" | "timeout" | "navigation" | "aborted";

export class RenderError extends Error {
  constructor(
    readonly code: RenderFailure,
    message: string,
  ) {
    super(message);
    this.name = "RenderError";
  }
}

export interface RenderOptions<T> {
  /** Self-contained function evaluated in the page after it settles. */
  probe: () => T;
  timeoutMs?: number;
  maxHtmlBytes?: number;
  maxRequests?: number;
  signal?: AbortSignal;
  /** Network policy for every browser request; defaults to public addresses. */
  network?: ProxyOptions;
}

const MAX_CONCURRENT = 2;
let running = 0;
const waiting: (() => void)[] = [];

async function slot() {
  if (running >= MAX_CONCURRENT)
    await new Promise<void>((resolve) => waiting.push(resolve));
  running += 1;
  return () => {
    running -= 1;
    waiting.shift()?.();
  };
}

// Records paint and layout metrics as they happen; read after the page settles.
function installVitals() {
  const vitals = {
    fcp: null as number | null,
    lcp: null as number | null,
    cls: 0,
  };
  (window as unknown as { __autopsyVitals: typeof vitals }).__autopsyVitals =
    vitals;
  const observe = (
    type: string,
    callback: (entry: PerformanceEntry) => void,
  ) => {
    try {
      new PerformanceObserver((list) =>
        list.getEntries().forEach(callback),
      ).observe({
        type,
        buffered: true,
      });
    } catch {
      // Unsupported entry type.
    }
  };
  observe("paint", (entry) => {
    if (entry.name === "first-contentful-paint") vitals.fcp = entry.startTime;
  });
  observe("largest-contentful-paint", (entry) => {
    vitals.lcp = entry.startTime;
  });
  observe("layout-shift", (entry) => {
    const shift = entry as PerformanceEntry & {
      value: number;
      hadRecentInput: boolean;
    };
    if (!shift.hadRecentInput) vitals.cls += shift.value;
  });
}

function readVitals(): PageVitals {
  const vitals = (
    window as unknown as {
      __autopsyVitals?: { fcp: number | null; lcp: number | null; cls: number };
    }
  ).__autopsyVitals;
  const navigation = performance.getEntriesByType("navigation")[0] as
    PerformanceNavigationTiming | undefined;
  return {
    ttfbMs: navigation ? navigation.responseStart : null,
    fcpMs: vitals?.fcp ?? null,
    lcpMs: vitals?.lcp ?? null,
    cls: vitals ? vitals.cls : null,
  };
}

async function summarize(
  request: Request,
): Promise<RenderedRequest & { started: number }> {
  const timing = request.timing();
  const response = await request.response().catch(() => null);
  const sizes = response ? await request.sizes().catch(() => null) : null;
  return {
    url: request.url(),
    type: request.resourceType(),
    status: response?.status() ?? null,
    bytes: sizes?.responseBodySize ?? 0,
    started: timing.startTime,
    startMs: 0,
    durationMs: timing.responseEnd >= 0 ? Math.round(timing.responseEnd) : null,
    failure: request.failure()?.errorText ?? null,
  };
}

/**
 * Load a page in headless Chromium with scripts enabled. Every browser request
 * goes through a public-network proxy, so page scripts cannot reach private
 * addresses; WebRTC is restricted to proxied connections, service workers
 * and downloads are disabled, and the browser is closed after each page.
 */
export async function renderPage<T>(
  url: string,
  {
    probe,
    timeoutMs = 20_000,
    maxHtmlBytes = 5_000_000,
    maxRequests = 300,
    signal,
    network,
  }: RenderOptions<T>,
): Promise<RenderedPage<T>> {
  const release = await slot();
  const proxy = await startPublicProxy(network);
  let browser: Browser | null = null;
  const close = () => void browser?.close().catch(() => {});
  signal?.addEventListener("abort", close, { once: true });
  const deadline = setTimeout(close, timeoutMs + 5_000);
  try {
    try {
      browser = await chromium.launch({
        headless: true,
        // "<-loopback>" removes Chromium's implicit loopback bypass, so even
        // 127.0.0.1 requests go through the guarded proxy.
        proxy: { server: proxy.url, bypass: "<-loopback>" },
        args: [
          "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
          "--webrtc-ip-handling-policy=disable_non_proxied_udp",
          "--disable-background-networking",
        ],
      });
    } catch {
      throw new RenderError(
        "unavailable",
        "The scanning browser could not be started.",
      );
    }
    const context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      serviceWorkers: "block",
      acceptDownloads: false,
    });
    const page = await context.newPage();
    await page.addInitScript(installVitals);
    const pending: ReturnType<typeof summarize>[] = [];
    let seen = 0;
    let consoleErrors = 0;
    const record = (request: Request) => {
      seen += 1;
      if (pending.length < maxRequests) pending.push(summarize(request));
    };
    page.on("requestfinished", record);
    page.on("requestfailed", record);
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors += 1;
    });
    page.on("pageerror", () => (consoleErrors += 1));
    try {
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: timeoutMs,
      });
    } catch (error) {
      if (signal?.aborted)
        throw new RenderError("aborted", "The scan was cancelled.");
      const text = String((error as Error).message);
      if (/Timeout/i.test(text))
        throw new RenderError(
          "timeout",
          `The page did not load within ${timeoutMs / 1000} s.`,
        );
      if (
        /ERR_TUNNEL_CONNECTION_FAILED|ERR_PROXY/i.test(text) ||
        proxy.blocked.length
      )
        throw new RenderError(
          "blocked",
          "The page address is not a public internet address.",
        );
      throw new RenderError(
        "navigation",
        `The page could not be loaded in the browser (${text.split("\n")[0]}).`,
      );
    }
    // A refused plain-HTTP document arrives as the proxy's own 403 page.
    const loaded = new URL(page.url());
    const authority = `${loaded.hostname}:${loaded.port || (loaded.protocol === "https:" ? "443" : "80")}`;
    if (proxy.blocked.includes(authority))
      throw new RenderError(
        "blocked",
        `${loaded.hostname} is not a public internet address.`,
      );
    // Pages with long-lived connections may never fire load or go idle, so
    // wait for both only briefly before inspecting what has rendered.
    await page.waitForLoadState("load", { timeout: 8_000 }).catch(() => {});
    await page
      .waitForLoadState("networkidle", { timeout: 3_000 })
      .catch(() => {});
    const vitals = await page.evaluate(readVitals);
    const result = await page.evaluate(probe);
    const content = await page.content();
    const raw = await Promise.all(pending);
    const base = Math.min(...raw.map(({ started }) => started));
    const requests = raw.map(({ started, ...request }) => ({
      ...request,
      startMs: Math.max(0, Math.round(started - base)),
    }));
    return {
      url: page.url(),
      html: content.slice(0, maxHtmlBytes),
      truncated: content.length > maxHtmlBytes,
      requests: requests.sort((a, b) => a.startMs - b.startMs),
      requestsTruncated: seen > pending.length,
      vitals: {
        ...vitals,
        ttfbMs: vitals.ttfbMs === null ? null : Math.round(vitals.ttfbMs),
        fcpMs: vitals.fcpMs === null ? null : Math.round(vitals.fcpMs),
        lcpMs: vitals.lcpMs === null ? null : Math.round(vitals.lcpMs),
        cls: vitals.cls === null ? null : Math.round(vitals.cls * 1000) / 1000,
      },
      consoleErrors,
      blocked: [...proxy.blocked],
      probe: result,
    };
  } catch (error) {
    if (error instanceof RenderError) throw error;
    if (signal?.aborted)
      throw new RenderError("aborted", "The scan was cancelled.");
    throw new RenderError(
      "navigation",
      "The browser stopped before the page could be inspected.",
    );
  } finally {
    clearTimeout(deadline);
    signal?.removeEventListener("abort", close);
    await browser?.close().catch(() => {});
    await proxy.close();
    release();
  }
}
