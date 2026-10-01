# autopsy conventions

Use Feature-Sliced Design. Read `docs/architecture.md` before moving boundaries.

- Root `app/` files contain one explicit re-export. Next.js route names are the only naming exception.
- Layer order: `_app` → `_pages` → `widgets` → `features` → `entities` → `shared`. Import only downwards; no sibling-slice imports.
- Outside a slice, use its explicit `index.ts` public API. Inside it, use relative imports. No wildcard re-exports or own-barrel imports.
- `_app` and `shared` have purpose-based segments, not business slices. Shared modules expose individual public APIs.
- Keep single-page UI and state in its page slice. Extract features/widgets for actual reuse, not file size. Do not create empty layers.
- Directories: kebab-case. Components: PascalCase.tsx. Other TypeScript modules: camelCase.ts.
- Keep demo data explicitly marked. Never present sample observations as a real scan or private infrastructure as observed fact.
- Before each PR: run relevant tests, `npm run check`, and a production build. Split changes into coherent PRs, record self-review honestly, and merge only verified heads under the user's authorization.
