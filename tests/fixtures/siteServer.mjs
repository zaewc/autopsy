// Local websites for browser tests. The app under test may scan this port
// only because playwright.config.ts sets AUTOPSY_SCAN_FIXTURE_PORT.
import { createServer } from "node:http";

const PORT = Number(process.env.PORT ?? 3101);
const page = (head, body = "") =>
  `<!doctype html><html lang="en"><head>${head}</head><body>${body}</body></html>`;

const ROUTES = {
  "/next": {
    headers: {
      "x-powered-by": "Next.js",
      "x-vercel-id": "icn1::fixture",
      "strict-transport-security": "max-age=63072000",
    },
    body: page(
      `<title>Next fixture</title><script src="/_next/static/chunks/main-app.js" async></script>`,
      `<img src="/hero.png" alt="Hero">`,
    ),
  },
  "/plain": {
    headers: { server: "github.com", "x-frame-options": "deny" },
    body: page(
      `<title>Plain fixture</title><meta name="description" content="A server-rendered page.">`,
      `<p>This article mentions /_next/static/ and __NEXT_DATA__ in prose.</p>`,
    ),
  },
  "/file.json": {
    headers: { "content-type": "application/json" },
    body: "{}",
  },
};

createServer((request, response) => {
  const path = new URL(request.url ?? "/", "http://fixture").pathname;
  if (path === "/slow") {
    const timer = setTimeout(
      () => response.end(page("<title>Slow</title>")),
      8000,
    );
    request.on("close", () => clearTimeout(timer));
    return;
  }
  const route = ROUTES[path];
  if (!route) return response.writeHead(404).end("missing");
  response.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    ...route.headers,
  });
  response.end(route.body);
}).listen(PORT, "127.0.0.1");
