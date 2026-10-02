# Architecture

autopsy follows [Feature-Sliced Design](https://feature-sliced.design/docs/get-started/overview) and the [official Next.js integration](https://feature-sliced.design/docs/guides/tech/with-nextjs), using [Patchwork](https://github.com/zaewc/Patchwork) as the project-convention reference.

`app/` is a Next.js adapter, not a second implementation layer. Routes re-export public APIs. `src/_app` owns layout and global styles; `src/_pages` owns complete screens. The underscores prevent Next.js from interpreting FSD layers as additional routers.

Dependencies flow strictly downwards: `_app` → `_pages` → `widgets` → `features` → `entities` → `shared`. Layers may be skipped. Unused layers need not exist. Slices on the same layer remain independent. Composition and coordination belong to their parent layer.

Each business slice has purpose-based segments (`ui`, `model`, `api`, `lib`, `config`) and an explicit `index.ts`. External consumers import that API. Internal modules use relative paths, never their own barrel. Shared reusable modules have individual APIs, such as `@/shared/ui/section-heading`. App and Shared do not have business slices. Avoid wildcard exports and circular imports.

Single-page blocks stay in that page's `ui`; page-specific state stays in its `model`. A feature represents a reusable user action, an entity represents a domain concept, and a widget represents a reusable composed block. Do not extract merely to populate every layer.

Steiger applies its recommended FSD rules. Three narrowly documented compatibility settings follow Patchwork: prefixed Next.js layer names, App segments, and module-level Shared APIs. `scripts/checkArchitecture.mjs` independently enforces layer order (including the prefixed names), same-layer isolation, public API access, explicit route adapters, and cycles. Its negative-fixture tests ensure violations are rejected, including dynamic and type imports. No business slice is exempt from dependency checks.

Server-only implementations must use separate `index.server.ts` APIs that import `server-only`; never export server dependencies from a client-safe barrel. The boundary checker treats `index.server.ts` as a public API, requires its `server-only` import, and rejects `"use client"` modules that import one. Route adapters may re-export an `_app` or `_pages` server API, such as a route handler. `features/run-analysis/index.server.ts` exposes the live scanner, `_app/api` owns route handlers, `shared/lib/public-http` owns the public-network fetch guard and forward proxy, and `shared/lib/rendered-page` owns the proxied headless-browser capture. Technology knowledge, including the in-page `runtimeProbe`, stays in `entities/analysis-report`; the browser capture only evaluates the probe it is given.

## Product boundaries

`_pages/analysis` owns the report workspace, its navigation, section selection, report export, and page-only sections. `_pages/new-analysis` owns the standalone entry experience. Neither page imports the other.

`features/run-analysis` owns the URL form, the client scan lifecycle (`useWebsiteScan`, which calls `/api/scan` and aborts on cancel), and the server-side `scanWebsite` action that fetches one public document and builds a live report. `GET /api/scan?url=` exposes it through `_app/api`. Both pages consume its `AnalysisForm` public API and receive the validated URL through a callback; the report page runs the scan, and the feature never imports a router or a page.

`entities/analysis-report` owns the report contract, technology detection, document audit, the sample fixture, and the architecture evidence visualization. The domain is consumed by both the feature and report page. Generic URL normalization and native dialog behavior live in module-level Shared APIs.

## Localization

English and Korean are supported. `shared/lib/i18n` resolves the locale from the `autopsy-locale` cookie, then `Accept-Language`, then English; `requestLocale()` in its server API reads it for layouts and route handlers, and `LocaleProvider`/`useMessages` pass it to client UI. Each slice owns its own `Localized` message tables next to the code that renders them; Shared never holds business copy. `/api/scan` writes server-generated report text (notices, errors, findings) in the request's locale, so a report keeps the language it was scanned in, including in exports. Protocol, header, directive, metric, and product names stay in English in every locale.

Component styles are colocated with their owning UI modules. `_app/styles` contains only global foundations and design primitives. The Widgets layer is intentionally absent: no composed widget is shared by these two screens. Report export remains page-local because only the report page owns that action.
