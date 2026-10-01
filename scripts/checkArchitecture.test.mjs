import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { checkArchitecture } from "./checkArchitecture.mjs";
function inspect(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "autopsy-fsd-"));
  try {
    for (const [name, code] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
      fs.writeFileSync(path.join(root, name), code);
    }
    return checkArchitecture(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}
const VALID = {
  "app/page.tsx": "export { Page as default } from '@/_pages/home';",
  "src/_pages/home/index.ts": "export { Page } from './ui/Page';",
  "src/_pages/home/ui/Page.tsx":
    "import { item } from '@/entities/report'; export const Page = item;",
  "src/entities/report/index.ts": "export { item } from './model/item';",
  "src/entities/report/model/item.ts": "export const item = 1;",
};
test("downward imports and route adapters pass", () =>
  assert.deepEqual(inspect(VALID), []));
const SERVER = {
  "app/api/report/route.ts": "export { GET } from '@/_app/api/index.server';",
  "src/_app/api/index.server.ts":
    "import 'server-only'; export { GET } from './report';",
  "src/_app/api/report.ts":
    "import { load } from '@/entities/report/index.server'; export const GET = load;",
  "src/entities/report/index.server.ts":
    "import 'server-only'; export { load } from './api/load';",
  "src/entities/report/api/load.ts": "export const load = () => null;",
};
test("server public APIs and server route adapters pass", () =>
  assert.deepEqual(inspect({ ...VALID, ...SERVER }), []));
for (const [name, file, code, pattern] of [
  [
    "upward dependency",
    "src/entities/report/model/item.ts",
    "import { Page } from '@/_pages/home'; export const item = Page;",
    /Forbidden layer/,
  ],
  [
    "deep import",
    "src/_pages/home/ui/Page.tsx",
    "import { item } from '@/entities/report/model/item'; export const Page = item;",
    /bypasses/,
  ],
  [
    "sibling dependency",
    "src/entities/other/model/value.ts",
    "import { item } from '@/entities/report'; export const value = item;",
    /Forbidden layer/,
  ],
  [
    "wildcard export",
    "src/entities/report/index.ts",
    "export * from './model/item';",
    /Wildcard/,
  ],
  [
    "own barrel",
    "src/entities/report/model/item.ts",
    "import { item as x } from '@/entities/report'; export const item = x;",
    /within a slice/,
  ],
  [
    "route logic",
    "app/page.tsx",
    "export default function Page() { return null; }",
    /one explicit/,
  ],
  [
    "unknown layer",
    "src/utils/value.ts",
    "export const value = 1;",
    /Unknown FSD/,
  ],
  [
    "dynamic bypass",
    "src/_pages/home/ui/Page.tsx",
    "export const Page = import('@/entities/report/model/item');",
    /bypasses/,
  ],
  [
    "type bypass",
    "src/_pages/home/ui/Page.tsx",
    "export type Page = import('@/entities/report/model/item').Item;",
    /bypasses/,
  ],
  [
    "server API without server-only",
    "src/entities/report/index.server.ts",
    "export { item } from './model/item';",
    /must import "server-only"/,
  ],
  [
    "client import of a server API",
    "src/_pages/home/ui/Page.tsx",
    "'use client'; import { load } from '@/entities/report/index.server'; export const Page = load;",
    /Client modules must not import/,
  ],
  [
    "server module deep import",
    "src/_pages/home/ui/Page.tsx",
    "import { load } from '@/entities/report/api/load'; export const Page = load;",
    /bypasses/,
  ],
  [
    "relative cycle",
    "src/entities/report/model/item.ts",
    "import { item as x } from '../index'; export const item = x;",
    /Circular/,
  ],
])
  test(`rejects ${name}`, () =>
    assert.match(
      inspect({ ...VALID, ...SERVER, [file]: code }).join("\n"),
      pattern,
    ));
