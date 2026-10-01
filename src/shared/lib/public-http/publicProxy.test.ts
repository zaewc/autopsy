import http, { createServer, type Server } from "node:http";
import net, { type AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startPublicProxy, type PublicProxy } from "./publicProxy";

let site: Server;
let port: string;

beforeAll(async () => {
  site = createServer((request, response) =>
    response.end(request.url === "/large" ? "x".repeat(50_000) : "hello"),
  );
  await new Promise<void>((resolve) => site.listen(0, "127.0.0.1", resolve));
  port = String((site.address() as AddressInfo).port);
});
afterAll(() => {
  site.closeAllConnections();
  site.close();
});

const local = () => ({
  isAllowedAddress: (address: string) => address === "127.0.0.1",
  allowedPorts: [port],
});

/** Send an absolute-form HTTP request through the proxy. */
function viaProxy(proxy: PublicProxy, target: string) {
  const { port: proxyPort } = new URL(proxy.url);
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    http
      .get({ host: "127.0.0.1", port: proxyPort, path: target }, (response) => {
        let body = "";
        response.on("data", (chunk) => (body += chunk));
        response.on("end", () =>
          resolve({ status: response.statusCode ?? 0, body }),
        );
        response.on("error", reject);
      })
      .on("error", reject);
  });
}

/** Open a CONNECT tunnel, optionally send a payload through it, and return all output. */
function tunnel(proxy: PublicProxy, authority: string, payload?: string) {
  const { port: proxyPort } = new URL(proxy.url);
  return new Promise<string>((resolve) => {
    const socket = net.connect(Number(proxyPort), "127.0.0.1", () =>
      socket.write(
        `CONNECT ${authority} HTTP/1.1\r\nHost: ${authority}\r\n\r\n`,
      ),
    );
    let text = "";
    socket.on("data", (chunk) => {
      const established = !text && String(chunk).startsWith("HTTP/1.1 200");
      text += chunk;
      if (established && payload) socket.write(payload);
      else if (!payload || text.includes("hello")) socket.end();
    });
    socket.on("close", () => resolve(text));
    socket.on("error", () => resolve(text));
  });
}

describe("startPublicProxy", () => {
  it("relays plain HTTP and CONNECT tunnels to allowed destinations", async () => {
    const proxy = await startPublicProxy(local());
    try {
      expect(await viaProxy(proxy, `http://127.0.0.1:${port}/`)).toEqual({
        status: 200,
        body: "hello",
      });
      const text = await tunnel(
        proxy,
        `127.0.0.1:${port}`,
        "GET / HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n",
      );
      expect(text).toMatch(/^HTTP\/1\.1 200 Connection Established/);
      expect(text).toContain("hello");
    } finally {
      await proxy.close();
    }
  });

  it("refuses loopback literals and hostnames under the default policy", async () => {
    const proxy = await startPublicProxy({ allowedPorts: [port] });
    try {
      expect((await viaProxy(proxy, `http://127.0.0.1:${port}/`)).status).toBe(
        403,
      );
      expect((await viaProxy(proxy, `http://localhost:${port}/`)).status).toBe(
        403,
      );
      expect(await tunnel(proxy, `127.0.0.1:${port}`)).toMatch(
        /^HTTP\/1\.1 403/,
      );
      expect(await tunnel(proxy, `localhost:${port}`)).toMatch(
        /^HTTP\/1\.1 403/,
      );
      expect(await tunnel(proxy, "[::1]:443")).toMatch(/^HTTP\/1\.1 403/);
      expect(proxy.blocked).toContain(`localhost:${port}`);
    } finally {
      await proxy.close();
    }
  });

  it("refuses ports outside the policy", async () => {
    const proxy = await startPublicProxy();
    try {
      expect(await tunnel(proxy, "example.com:22")).toMatch(/^HTTP\/1\.1 403/);
      expect((await viaProxy(proxy, "http://example.com:8080/")).status).toBe(
        403,
      );
      expect(proxy.blocked).toEqual(["example.com:22", "example.com:8080"]);
    } finally {
      await proxy.close();
    }
  });

  it("stops relaying when the byte budget is exhausted", async () => {
    const proxy = await startPublicProxy({ ...local(), maxBytes: 1000 });
    try {
      const result = await viaProxy(
        proxy,
        `http://127.0.0.1:${port}/large`,
      ).catch(() => ({ status: 0, body: "" }));
      expect(result.body.length).toBeLessThan(50_000);
      expect(proxy.exhausted).toBe(true);
    } finally {
      await proxy.close();
    }
  });
});
