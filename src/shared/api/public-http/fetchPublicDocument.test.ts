import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { gzipSync } from "node:zlib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fetchPublicDocument, PublicFetchError } from "./fetchPublicDocument";

let server: Server;
let base: string;
let port: string;
const local = () => ({
  isAllowedAddress: (address: string) => address === "127.0.0.1",
  allowedPorts: [port],
});

beforeAll(async () => {
  server = createServer((request, response) => {
    const path = request.url ?? "/";
    if (path === "/page") {
      response.setHeader("x-powered-by", "Test");
      response.setHeader("set-cookie", ["a=1", "b=2"]);
      response.setHeader("content-type", "text/html; charset=utf-8");
      response.end("<html><title>Hello ✓</title></html>");
    } else if (path === "/redirect") {
      response.writeHead(302, { location: "/page" }).end();
    } else if (path.startsWith("/loop")) {
      response.writeHead(301, { location: "/loop" }).end();
    } else if (path === "/private") {
      response.writeHead(307, { location: "http://10.0.0.1/" }).end();
    } else if (path === "/gzip") {
      response.writeHead(200, { "content-encoding": "gzip" });
      response.end(gzipSync("compressed body"));
    } else if (path === "/large") {
      response.end("x".repeat(5000));
    } else if (path === "/slow") {
      setTimeout(() => response.end("late"), 2000);
    } else {
      response.writeHead(404).end("missing");
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  port = String((server.address() as AddressInfo).port);
  base = `http://127.0.0.1:${port}`;
});

afterAll(() => {
  server.closeAllConnections();
  server.close();
});

async function failure(promise: Promise<unknown>) {
  const error = await promise.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(PublicFetchError);
  return (error as PublicFetchError).code;
}

describe("fetchPublicDocument", () => {
  it("returns the status, headers, decoded body, and timing", async () => {
    const document = await fetchPublicDocument(`${base}/page`, local());
    expect(document.status).toBe(200);
    expect(document.body).toContain("Hello ✓");
    expect(document.headers["x-powered-by"]).toBe("Test");
    expect(document.headers["set-cookie"]).toBe("a=1, b=2");
    expect(document.responseMs).toBeGreaterThanOrEqual(0);
    expect(document.truncated).toBe(false);
  });

  it("follows relative redirects and records each hop", async () => {
    const document = await fetchPublicDocument(`${base}/redirect`, local());
    expect(document.url).toBe(`${base}/page`);
    expect(document.redirects).toEqual([`${base}/redirect`]);
  });

  it("returns error statuses instead of throwing", async () => {
    expect((await fetchPublicDocument(`${base}/none`, local())).status).toBe(
      404,
    );
  });

  it("decompresses gzip responses", async () => {
    const document = await fetchPublicDocument(`${base}/gzip`, local());
    expect(document.body).toBe("compressed body");
  });

  it("truncates bodies at the byte limit", async () => {
    const document = await fetchPublicDocument(`${base}/large`, {
      ...local(),
      maxBytes: 1000,
    });
    expect(document.bytes).toBe(1000);
    expect(document.truncated).toBe(true);
  });

  it("limits redirects", async () => {
    expect(
      await failure(
        fetchPublicDocument(`${base}/loop`, { ...local(), maxRedirects: 2 }),
      ),
    ).toBe("redirects");
  });

  it("validates every redirect target", async () => {
    expect(await failure(fetchPublicDocument(`${base}/private`, local()))).toBe(
      "blocked",
    );
  });

  it("times out slow responses", async () => {
    expect(
      await failure(
        fetchPublicDocument(`${base}/slow`, { ...local(), timeoutMs: 100 }),
      ),
    ).toBe("timeout");
  });

  it("can be cancelled", async () => {
    const controller = new AbortController();
    const pending = fetchPublicDocument(`${base}/slow`, {
      ...local(),
      signal: controller.signal,
    });
    controller.abort();
    expect(await failure(pending)).toBe("aborted");
  });

  it("blocks loopback literals and hostnames by default", async () => {
    const ports = { allowedPorts: [port] };
    expect(await failure(fetchPublicDocument(`${base}/page`, ports))).toBe(
      "blocked",
    );
    expect(
      await failure(
        fetchPublicDocument(`http://localhost:${port}/page`, ports),
      ),
    ).toBe("blocked");
    expect(await failure(fetchPublicDocument("http://[::1]/", ports))).toBe(
      "blocked",
    );
  });

  it("rejects other schemes, credentials, and ports", async () => {
    expect(await failure(fetchPublicDocument("ftp://example.com/"))).toBe(
      "invalid-url",
    );
    expect(
      await failure(fetchPublicDocument("https://user:pass@example.com/")),
    ).toBe("invalid-url");
    expect(await failure(fetchPublicDocument("http://example.com:22/"))).toBe(
      "blocked",
    );
    expect(await failure(fetchPublicDocument("not a url"))).toBe("invalid-url");
  });
});
