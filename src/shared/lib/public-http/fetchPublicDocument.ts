import http from "node:http";
import { isIP } from "node:net";
import https from "node:https";
import type { Readable } from "node:stream";
import type { TLSSocket } from "node:tls";
import zlib from "node:zlib";
import { describeTls, type TlsDetails } from "./describeTls";
import { isPublicAddress } from "./isPublicAddress";
import { createGuardedLookup, PublicNetworkError } from "./publicLookup";

export interface PublicDocument {
  /** URL that produced the final response, after redirects. */
  url: string;
  status: number;
  /** Lower-cased header names; repeated headers are joined with ", ". */
  headers: Readonly<Record<string, string>>;
  body: string;
  /** Every URL requested before the final one. */
  redirects: readonly string[];
  /** Milliseconds from the final request until its response headers. */
  responseMs: number;
  /** Each Set-Cookie header of the final response, unjoined. */
  setCookies: readonly string[];
  /** TLS session of the final response; null over plain HTTP. */
  tls: TlsDetails | null;
  /** Decoded body bytes read. */
  bytes: number;
  /** The body exceeded `maxBytes` and was cut off. */
  truncated: boolean;
}

export type FetchFailure =
  | "invalid-url"
  | "blocked"
  | "dns"
  | "connection"
  | "timeout"
  | "redirects"
  | "aborted";

export class PublicFetchError extends Error {
  constructor(
    readonly code: FetchFailure,
    message: string,
  ) {
    super(message);
    this.name = "PublicFetchError";
  }
}

export interface FetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  signal?: AbortSignal;
  /** Address policy; defaults to public internet addresses only. */
  isAllowedAddress?: (address: string) => boolean;
  /** Explicit ports; defaults to the scheme default, 80, and 443. */
  allowedPorts?: readonly string[];
}

const REDIRECTS = new Set([301, 302, 303, 307, 308]);
const USER_AGENT =
  "Mozilla/5.0 (compatible; autopsy/0.1; +https://github.com/zaewc/autopsy)";

function checkUrl(
  url: URL,
  { isAllowedAddress, allowedPorts }: Required<Omit<FetchOptions, "signal">>,
) {
  if (!["http:", "https:"].includes(url.protocol))
    throw new PublicFetchError("invalid-url", "Only HTTP and HTTPS are used.");
  if (url.username || url.password)
    throw new PublicFetchError(
      "invalid-url",
      "URLs with credentials are not fetched.",
    );
  // Non-default ports commonly expose internal or administrative services.
  if (url.port && !allowedPorts.includes(url.port))
    throw new PublicFetchError("blocked", "Only ports 80 and 443 are fetched.");
  // Node skips DNS lookup for IP literals, so check them here.
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host) && !isAllowedAddress(host))
    throw new PublicFetchError(
      "blocked",
      `${host} is not a public internet address.`,
    );
}

function decode(response: http.IncomingMessage): Readable {
  switch (response.headers["content-encoding"]?.trim().toLowerCase()) {
    case "gzip":
    case "x-gzip":
      return response.pipe(zlib.createGunzip());
    case "br":
      return response.pipe(zlib.createBrotliDecompress());
    case "deflate":
      return response.pipe(zlib.createInflate());
    default:
      return response;
  }
}

function charset(contentType: string) {
  const name = contentType.match(/charset=["']?([\w-]+)/i)?.[1] ?? "utf-8";
  try {
    return new TextDecoder(name);
  } catch {
    return new TextDecoder("utf-8");
  }
}

function headerRecord(response: http.IncomingMessage) {
  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(response.headers))
    if (value !== undefined)
      headers[name] = Array.isArray(value) ? value.join(", ") : value;
  return headers;
}

function failure(error: unknown, signal: AbortSignal): PublicFetchError {
  if (error instanceof PublicFetchError) return error;
  if (error instanceof PublicNetworkError)
    return new PublicFetchError("blocked", error.message);
  if (signal.aborted)
    return signal.reason instanceof PublicFetchError
      ? signal.reason
      : new PublicFetchError("aborted", "The request was cancelled.");
  const code = (error as NodeJS.ErrnoException).code;
  if (code === "ENOTFOUND" || code === "EAI_AGAIN")
    return new PublicFetchError("dns", "The hostname could not be resolved.");
  return new PublicFetchError(
    "connection",
    `The website could not be reached${code ? ` (${code})` : ""}.`,
  );
}

function request(
  url: URL,
  options: Required<Omit<FetchOptions, "signal">>,
  signal: AbortSignal,
) {
  const client = url.protocol === "https:" ? https : http;
  return new Promise<{
    response: http.IncomingMessage;
    responseMs: number;
    tls: TlsDetails | null;
  }>((resolve, reject) => {
    const started = performance.now();
    const outgoing = client.get(
      url,
      {
        signal,
        lookup: createGuardedLookup(options.isAllowedAddress),
        headers: {
          "user-agent": USER_AGENT,
          accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
          "accept-encoding": "gzip, deflate, br",
        },
      },
      (response) =>
        resolve({
          response,
          responseMs: performance.now() - started,
          // Read now: the socket may be reused or closed after the body.
          tls:
            url.protocol === "https:"
              ? describeTls(response.socket as TLSSocket)
              : null,
        }),
    );
    outgoing.on("error", reject);
  });
}

async function readBody(
  response: http.IncomingMessage,
  maxBytes: number,
): Promise<{ body: string; bytes: number; truncated: boolean }> {
  const decoder = charset(response.headers["content-type"] ?? "");
  const stream = decode(response);
  let bytes = 0;
  let truncated = false;
  let body = "";
  for await (const chunk of stream as AsyncIterable<Buffer>) {
    const room = maxBytes - bytes;
    const part = chunk.length > room ? chunk.subarray(0, room) : chunk;
    bytes += part.length;
    body += decoder.decode(part, { stream: true });
    if (chunk.length > room) {
      truncated = true;
      break;
    }
  }
  response.destroy();
  return { body: body + decoder.decode(), bytes, truncated };
}

/**
 * GET a public web document with redirect, time, and size limits. Every hop is
 * validated, and sockets only connect to addresses accepted by the policy.
 */
export async function fetchPublicDocument(
  input: string | URL,
  {
    timeoutMs = 10_000,
    maxBytes = 2_000_000,
    maxRedirects = 5,
    signal: external,
    isAllowedAddress = isPublicAddress,
    allowedPorts = ["80", "443"],
  }: FetchOptions = {},
): Promise<PublicDocument> {
  const options = {
    timeoutMs,
    maxBytes,
    maxRedirects,
    isAllowedAddress,
    allowedPorts,
  };
  const controller = new AbortController();
  const timer = setTimeout(
    () =>
      controller.abort(
        new PublicFetchError(
          "timeout",
          `The website did not respond within ${timeoutMs / 1000} s.`,
        ),
      ),
    timeoutMs,
  );
  const cancel = () => controller.abort();
  external?.addEventListener("abort", cancel, { once: true });
  const redirects: string[] = [];
  try {
    let url: URL;
    try {
      url = new URL(input);
    } catch {
      throw new PublicFetchError("invalid-url", "The URL is not valid.");
    }
    for (;;) {
      checkUrl(url, options);
      const { response, responseMs, tls } = await request(
        url,
        options,
        controller.signal,
      );
      const location = response.headers.location;
      if (REDIRECTS.has(response.statusCode ?? 0) && location) {
        response.resume();
        if (redirects.length >= maxRedirects)
          throw new PublicFetchError(
            "redirects",
            `The website redirected more than ${maxRedirects} times.`,
          );
        redirects.push(url.href);
        url = new URL(location, url);
        continue;
      }
      const body = await readBody(response, maxBytes);
      return {
        url: url.href,
        status: response.statusCode ?? 0,
        headers: headerRecord(response),
        redirects,
        responseMs: Math.round(responseMs),
        setCookies: response.headers["set-cookie"] ?? [],
        tls,
        ...body,
      };
    }
  } catch (error) {
    throw failure(error, controller.signal);
  } finally {
    clearTimeout(timer);
    external?.removeEventListener("abort", cancel);
  }
}
