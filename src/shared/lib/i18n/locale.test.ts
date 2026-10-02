import { expect, it } from "vitest";
import { resolveLocale } from "./locale";

it("prefers a saved choice over the browser's languages", () => {
  expect(resolveLocale("ko", "en-US,en;q=0.9")).toBe("ko");
  expect(resolveLocale("en", "ko-KR,ko;q=0.9")).toBe("en");
});

it("picks the highest-quality supported browser language", () => {
  expect(resolveLocale(undefined, "ko-KR,ko;q=0.9,en;q=0.8")).toBe("ko");
  expect(resolveLocale(undefined, "fr;q=0.9,en;q=0.5,ko;q=0.7")).toBe("ko");
  expect(resolveLocale(undefined, "en-GB, ko")).toBe("en");
  expect(resolveLocale(undefined, "ko;q=0, en;q=0.1")).toBe("en");
});

it("falls back to English for unknown or missing values", () => {
  expect(resolveLocale("de", null)).toBe("en");
  expect(resolveLocale(undefined, "fr-FR,ja;q=0.8")).toBe("en");
  expect(resolveLocale(undefined, "")).toBe("en");
});
