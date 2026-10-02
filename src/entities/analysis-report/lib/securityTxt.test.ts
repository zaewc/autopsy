import { describe, expect, it } from "vitest";
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

describe("securityTxtIssues in Korean", () => {
  it("translates missing and expired notices", () => {
    expect(securityTxtIssues("https://site.test", null, "ko")[0]).toMatchObject(
      {
        id: "disclosure-security-txt-missing",
        title: "security.txt 연락처가 없습니다",
      },
    );
    const expired = parseSecurityTxt(
      "https://site.test/.well-known/security.txt",
      "Contact: mailto:a@site.test\nExpires: 2020-01-01T00:00:00Z",
    );
    expect(
      securityTxtIssues("https://site.test", expired, "ko")[0],
    ).toMatchObject({
      id: "disclosure-security-txt-expired",
      title: "security.txt가 만료되었습니다",
      evidence: "Expires: 2020-01-01T00:00:00Z",
    });
  });
});
