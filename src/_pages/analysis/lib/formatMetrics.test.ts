import { expect, it } from "vitest";
import { formatKilobytes, resourceLabel, shortUrl } from "./formatMetrics";

it("formats sizes, labels, and URLs for compact rows", () => {
  expect(formatKilobytes(576_232)).toBe("576.2 kB");
  expect(resourceLabel("fetch")).toBe("XHR");
  expect(resourceLabel("manifest")).toBe("OTHER");
  expect(shortUrl("https://cdn.example.com/a/app%20main.js?v=1")).toBe(
    "app main.js",
  );
  expect(shortUrl("https://github.com/")).toBe("github.com");
});
