import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, expect, it } from "vitest";
import { renderPage } from "@/shared/lib/rendered-page/index.server";
import { runtimeProbe } from "./runtimeProbe";

let site: Server;
let port: string;

const PAGE = `<!doctype html><html><body><div id="app"></div><script>
  window.next = { version: "15.1.0", router: {} };
  const app = document.getElementById("app");
  app.__vue_app__ = { version: "3.4.21" };
  app["__reactFiber$x1"] = {};
  window.__svelte = { v: new Set(["5"]) };
  window.jQuery = { fn: { jquery: "3.7.1" } };
  window.htmx = { version: "not-a-version" };
</script></body></html>`;

beforeAll(async () => {
  site = createServer((_request, response) => {
    response.setHeader("content-type", "text/html");
    response.end(PAGE);
  });
  await new Promise<void>((resolve) => site.listen(0, "127.0.0.1", resolve));
  port = String((site.address() as AddressInfo).port);
});
afterAll(() => {
  site.closeAllConnections();
  site.close();
});

it("reads runtime globals in a real browser", { timeout: 30_000 }, async () => {
  const page = await renderPage(`http://127.0.0.1:${port}/`, {
    probe: runtimeProbe,
    network: {
      isAllowedAddress: (address) => address === "127.0.0.1",
      allowedPorts: [port],
    },
  });
  expect(page.probe).toEqual({
    next: "15.1.0",
    react: "present",
    vue: "3.4.21",
    svelte: "5",
    jquery: "3.7.1",
    htmx: "present",
  });
});
