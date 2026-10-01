import { expect, it } from "vitest";
import { toSiteParam } from "./siteParam";

it("compacts HTTPS origins and keeps paths and other schemes", () => {
  expect(toSiteParam(new URL("https://github.com/"))).toBe("github.com");
  expect(toSiteParam(new URL("https://example.org/path/"))).toBe(
    "example.org/path/",
  );
  expect(toSiteParam(new URL("https://example.org/?q=1"))).toBe(
    "example.org/?q=1",
  );
  expect(toSiteParam(new URL("http://example.org/"))).toBe(
    "http://example.org/",
  );
});
