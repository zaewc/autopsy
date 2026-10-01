# autopsy

A restrained developer diagnostic workspace built with Next.js App Router, React, TypeScript, Tailwind CSS, and Lucide icons.

## Run

```sh
npm install
npm run dev
```

Open http://localhost:3000. Use **New analysis** or **⌘/Ctrl K** to open the URL entry experience.

```sh
npm run build
npm run typecheck
```

## Scope

Entering a URL runs a live scan in two stages:

1. **HTML response.** The autopsy server fetches the document (up to 5 redirects, 10 seconds, 2 MB) for response headers, markup, and security header, document language, image, and search metadata checks.
2. **Browser.** Headless Chromium loads the page with scripts running (DOMContentLoaded within 20 seconds, then up to 8 seconds for load and 3 seconds for network idle). It records the rendered DOM, framework and library runtime globals, up to 300 requests, console errors, and lab TTFB, FCP, LCP, and CLS on a desktop viewport without throttling. Interaction latency (INP) is not measured.

Technologies are identified from both stages, each with the matched evidence (header, HTML, rendered DOM, runtime global, or network request) and an observed/inferred basis. If the browser cannot run, the report keeps the HTML-stage results and says why.

Both stages only reach public internet addresses on ports 80 and 443. The HTML fetch checks every redirect and every socket connection. Every browser request, including page scripts' fetches and WebSockets, goes through a loopback proxy that applies the same check at connection time and refuses private, loopback, link-local, and reserved destinations; refused destinations are listed in the report. WebRTC is limited to proxied connections, and service workers and downloads are disabled. At most two browser scans run at once. There is no rate limiting yet; add it before exposing the scanner publicly.

The server needs a Chromium build for the browser stage: run `npx playwright install chromium`. Set `AUTOPSY_BROWSER_SCAN=0` to turn the stage off on servers without it.

`/` without a URL shows an illustrative sample report that is not attributed to any website. Recent scans are held in memory for the current session. JSON exports keep the `sample` or `live` designation.

## Architecture and checks

Use Node 24 (`nvm use`). Routes are thin re-exports; product code follows Feature-Sliced Design under `src`. See [architecture decisions](docs/architecture.md) and [contributor rules](AGENTS.md).

- `/`: report workspace; `/?site=<url>` scans that URL, and no parameter shows the sample report.
- `/new`: URL entry, sharing `features/run-analysis` with the report dialog.
- `/api/scan?url=`: server scan endpoint returning a report or a typed error.
- `features/run-analysis`: URL form, client scan lifecycle, and the server-only `scanWebsite`.
- `entities/analysis-report`: report types, technology detection, document audit, the sample fixture, and architecture evidence visualization.
- `_pages/analysis`: report composition, navigation, section state, and export actions.
- `shared`: URL normalization, the server-only public-network fetch and proxy, proxied headless-browser capture, and reusable UI primitives.

```sh
npm run check
npm run build
```

`check` runs TypeScript, ESLint, Steiger, the additional import-boundary checker, its negative-fixture tests, and Vitest unit tests (`npm run test:unit`). There are no artificial widget slices or same-layer cross-import exceptions.

## Browser regression tests

```sh
npx playwright install chrome
npm run test:all
```

Local tests use Chrome; CI installs Playwright Chromium. The harness builds and starts a production server on port 3100, with `.next-e2e` isolated from normal `.next` output, plus fixture websites on port 3101 (`tests/fixtures/siteServer.mjs`). `AUTOPSY_SCAN_FIXTURE_PORT` lets the scanner reach that loopback port during tests only; never set it in a deployment. Tests cover the sample report, live scans of fixture sites (including a page that mentions Next.js paths in prose), blocked and non-HTML targets, scan cancellation, evidence expansion, export, keyboard navigation, and desktop/mobile viewport fit. GitHub Actions runs these checks for every PR and push to `main`.

Technology marks come from [Simple Icons](https://simpleicons.org) (CC0); the trademarks belong to their owners.
