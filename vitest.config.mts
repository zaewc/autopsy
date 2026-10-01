import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  // tsconfig preserves JSX for Next.js; tests import UI through public APIs.
  oxc: { jsx: { runtime: "automatic" } },
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});
