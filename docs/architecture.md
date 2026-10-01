# Architecture

autopsy follows [Feature-Sliced Design](https://feature-sliced.design/docs/get-started/overview) and the [official Next.js integration](https://feature-sliced.design/docs/guides/tech/with-nextjs), using [Patchwork](https://github.com/zaewc/Patchwork) as the project-convention reference.

`app/` is a Next.js adapter, not a second implementation layer. Routes re-export public APIs. `src/_app` owns layout and global styles; `src/_pages` owns complete screens. The underscores prevent Next.js from interpreting FSD layers as additional routers.

Dependencies flow strictly downwards: `_app` → `_pages` → `widgets` → `features` → `entities` → `shared`. Layers may be skipped. Unused layers need not exist. Slices on the same layer remain independent. Composition and coordination belong to their parent layer.

Each business slice has purpose-based segments (`ui`, `model`, `api`, `lib`, `config`) and an explicit `index.ts`. External consumers import that API. Internal modules use relative paths, never their own barrel. Shared reusable modules have individual APIs, such as `@/shared/ui/section-heading`. App and Shared do not have business slices. Avoid wildcard exports and circular imports.

Single-page blocks stay in that page's `ui`; page-specific state stays in its `model`. A feature represents a reusable user action, an entity represents a domain concept, and a widget represents a reusable composed block. Do not extract merely to populate every layer.

Steiger applies its recommended FSD rules. Three narrowly documented compatibility settings follow Patchwork: prefixed Next.js layer names, App segments, and module-level Shared APIs. `scripts/checkArchitecture.mjs` independently enforces layer order (including the prefixed names), same-layer isolation, public API access, explicit route adapters, and cycles. Its negative-fixture tests ensure violations are rejected, including dynamic and type imports. No business slice is exempt from dependency checks.

Server-only implementations, when introduced, must use separate `index.server.ts` APIs and `server-only`; never export server dependencies from a client-safe barrel. There is no live scanner or backend in this prototype.
