import fsd from "@feature-sliced/steiger-plugin";
import { defineConfig } from "steiger";

export default defineConfig([
  ...fsd.configs.recommended,
  // The documented Next.js layer aliases are also checked by checkArchitecture.mjs.
  { rules: { "fsd/typo-in-layer-name": "off" } },
  // _app has purpose-based segments, never business slices.
  { files: ["./src/_app/**"], rules: { "fsd/no-segmentless-slices": "off" } },
  // Shared exposes one API per reusable module; our boundary checker validates each.
  { files: ["./src/shared/**"], rules: { "fsd/public-api": "off" } },
]);
