import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { renderPage, RenderError } from "./renderPage";

let site: Server;
let base: string;
let port: string;

const PAGE = `<!doctype html><html><head><title>Fixture</title>
<link rel="stylesheet" href="/style.css"></head>
<body><main id="app"></main>
<script>
  window.fixtureFramework = { version: "3.1.4" };
  document.getElementById("app").innerHTML = '<h1 data-rendered="yes">Rendered by script</h1>';
  fetch("/api/data");
  fetch("http://127.0.0.1:8089/private").catch(() => {});
  fetch("http://10.0.0.1/metadata").catch(() => {});
</script></body></html>`;

beforeAll(async () => {
  site = createServer((request, response) => {
    if (request.url === "/") {
      response.setHeader("content-type", "text/html");
      return response.end(PAGE);
    }
    if (request.url === "/style.css") {
      response.setHeader("content-type", "text/css");
      return response.end("h1 { color: red }");
    }
    if (request.url === "/api/data") return response.end("{}");
    if (request.url === "/slow") return;
    response.writeHead(404).end();
  });
  await new Promise<void>((resolve) => site.listen(0, "127.0.0.1", resolve));
  port = String((site.address() as AddressInfo).port);
  base = `http://127.0.0.1:${port}`;
});
afterAll(() => {
  site.closeAllConnections();
  site.close();
});

const network = () => ({
  isAllowedAddress: (address: string) => address === "127.0.0.1",
  allowedPorts: [port],
});
const probe = () =>
  (window as unknown as { fixtureFramework?: { version: string } })
    .fixtureFramework?.version ?? null;

describe("renderPage", { timeout: 30_000 }, () => {
  it("runs scripts and returns the rendered DOM, requests, and metrics", async () => {
    const page = await renderPage(`${base}/`, { probe, network: network() });
    expect(page.html).toContain('data-rendered="yes"');
    expect(page.probe).toBe("3.1.4");
    expect(page.url).toBe(`${base}/`);
    const byPath = (path: string) =>
      page.requests.find((request) => request.url === `${base}${path}`);
    expect(byPath("/")).toMatchObject({ type: "document", status: 200 });
    expect(byPath("/style.css")).toMatchObject({
      type: "stylesheet",
      status: 200,
    });
    expect(byPath("/api/data")).toMatchObject({ type: "fetch", status: 200 });
    expect(page.requests[0].startMs).toBe(0);
    expect(page.vitals.ttfbMs).not.toBeNull();
    expect(page.vitals.fcpMs).toBeGreaterThan(0);
  });

  it("refuses page requests outside the network policy", async () => {
    const page = await renderPage(`${base}/`, {
      probe,
      network: { ...network(), allowedPorts: [port, "80"] },
    });
    expect(page.blocked).toContain("127.0.0.1:8089");
    expect(page.blocked).toContain("10.0.0.1:80");
    expect(
      page.requests.find(({ url }) => url === "http://127.0.0.1:8089/private")
        ?.failure,
    ).toBeTruthy();
  });

  it("blocks loopback pages under the default public policy", async () => {
    const error = await renderPage(`${base}/`, {
      probe,
      network: { allowedPorts: [port] },
    }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(RenderError);
    expect((error as RenderError).code).toBe("blocked");
  });

  it("times out pages that never finish loading", async () => {
    const error = await renderPage(`${base}/slow`, {
      probe,
      network: network(),
      timeoutMs: 1_000,
    }).catch((caught: unknown) => caught);
    expect((error as RenderError).code).toBe("timeout");
  });
});
