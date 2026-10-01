import { expect, it } from "vitest";
import { parseSecurityTxt, securityTxtIssues } from "./securityTxt";

const NOW = new Date("2026-10-01T00:00:00Z");

it("reads contacts, expiry, and policy", () => {
  expect(
    parseSecurityTxt(
      "https://site.test/.well-known/security.txt",
      "# comment\nContact: mailto:security@site.test\nContact: https://site.test/report\nExpires: 2026-01-01T00:00:00.000Z\nPolicy: https://site.test/policy\n",
      NOW,
    ),
  ).toEqual({
    url: "https://site.test/.well-known/security.txt",
    contact: ["mailto:security@site.test", "https://site.test/report"],
    expires: "2026-01-01T00:00:00.000Z",
    expired: true,
    policy: "https://site.test/policy",
  });
});

it("ignores responses without a Contact field", () => {
  expect(
    parseSecurityTxt("u", "<!doctype html><title>Not found</title>", NOW),
  ).toBeNull();
});

it("reports missing and expired files only", () => {
  expect(securityTxtIssues("https://site.test", null)[0].id).toBe(
    "disclosure-security-txt-missing",
  );
  const valid = {
    url: "u",
    contact: ["mailto:a@b"],
    expires: null,
    expired: false,
    policy: null,
  };
  expect(securityTxtIssues("https://site.test", valid)).toEqual([]);
  expect(
    securityTxtIssues("https://site.test", { ...valid, expired: true })[0]
      .severity,
  ).toBe("low");
});
