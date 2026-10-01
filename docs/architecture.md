# Architecture

autopsy follows [Feature-Sliced Design](https://feature-sliced.design/docs/get-started/overview) and the [official Next.js integration](https://feature-sliced.design/docs/guides/tech/with-nextjs), using [Patchwork](https://github.com/zaewc/Patchwork) as the project-convention reference.

`app/` is a Next.js adapter, not a second implementation layer. Routes re-export public APIs. `src/_app` owns layout and global styles; `src/_pages` owns complete screens. The underscores prevent Next.js from interpreting FSD layers as additional routers.

Dependencies flow strictly downwards: `_app` → `_pages` → `widgets` → `features` → `entities` → `shared`. Layers may be skipped. Unused layers need not exist. Slices on the same layer remain independent. Composition and coordination belong to their parent layer.

Each business slice has purpose-based segments (`ui`, `model`, `api`, `lib`, `config`) and an explicit `index.ts`. External consumers import that API. Internal modules use relative paths, never their own barrel. Shared reusable modules have individual APIs, such as `@/shared/ui/section-heading`. App and Shared do not have business slices. Avoid wildcard exports and circular imports.

Single-page blocks stay in that page's `ui`; page-specific state stays in its `model`. A feature represents a reusable user action, an entity represents a domain concept, and a widget represents a reusable composed block. Do not extract merely to populate every layer.

Steiger applies its recommended FSD rules. Three narrowly documented compatibility settings follow Patchwork: prefixed Next.js layer names, App segments, and module-level Shared APIs. `scripts/checkArchitecture.mjs` independently enforces layer order (including the prefixed names), same-layer isolation, public API access, explicit route adapters, and cycles. Its negative-fixture tests ensure violations are rejected, including dynamic and type imports. No business slice is exempt from dependency checks.

Server-only implementations, when introduced, must use separate `index.server.ts` APIs and `server-only`; never export server dependencies from a client-safe barrel. There is no live scanner or backend in this prototype.

## Product boundaries

`_pages/analysis` owns the report workspace, its navigation, section selection, report export, and page-only sections. `_pages/new-analysis` owns the standalone entry experience. Neither page imports the other.

`features/run-analysis` owns URL-entry state and the cancellable sample-scan lifecycle. Both pages consume its `AnalysisForm` public API and receive completion through a callback; the feature never imports a router or a page.

`entities/analysis-report` owns the report contract, sample fixtures, and the architecture evidence visualization. The domain is consumed by both the feature and report page. Generic URL normalization and native dialog behavior live in module-level Shared APIs.

Component styles are colocated with their owning UI modules. `_app/styles` contains only global foundations and design primitives. The Widgets layer is intentionally absent: no composed widget is shared by these two screens. Report export remains page-local because only the report page owns that action.
