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

This is an interactive frontend prototype. All report values, technology detections, timings, confidence levels, and findings are illustrative sample data. Entering a URL runs a staged demonstration and labels the sample report with that hostname; it does not fetch or analyze that website. Recent reports are held in memory for the current session. JSON exports preserve the sample-data designation.

The interface includes nine report views, expandable evidence, finding filters, resource timing charts, an observed/inferred architecture diagram, report copy/download, URL validation, responsive navigation, and reduced-motion support. Charts are native CSS/SVG and require no charting dependency.

A production implementation needs a separate isolated browser scanning service, public-network URL validation, measured audit results, and persistent reports. Private infrastructure must remain unknown unless independently evidenced.

## Architecture and checks

Use Node 24 (`nvm use`). Routes are thin re-exports; product code follows Feature-Sliced Design under `src`. See [architecture decisions](docs/architecture.md) and [contributor rules](AGENTS.md).

- `/`: interactive sample report.
- `/new`: URL entry and staged sample analysis, sharing `features/run-analysis` with the report dialog.
- `entities/analysis-report`: report types, illustrative fixtures, and architecture evidence visualization.
- `_pages/analysis`: report composition, navigation, section state, and export actions.
- `shared`: domain-independent URL normalization and reusable UI primitives.

```sh
npm run check
npm run build
```

`check` runs TypeScript, ESLint, Steiger, the additional import-boundary checker, and its negative-fixture tests. There are no artificial widget slices or same-layer cross-import exceptions.
