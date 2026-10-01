import { describe, expect, it } from "vitest";
import { auditDocument } from "./auditDocument";

const SECURE = {
  "strict-transport-security": "max-age=63072000; includeSubDomains",
  "content-security-policy": "default-src 'self'; frame-ancestors 'none'",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
};
const COMPLETE = `<!doctype html><html lang="en"><head>
  <title>Example Domain</title>
  <meta name="description" content="An example page.">
  <link rel="canonical" href="https://example.com/">
</head><body><img src="a.png" alt="Logo" width="10" height="10"></body></html>`;

const status = (checks: { name: string; status: string }[], name: string) =>
  checks.find((check) => check.name === name)?.status;

describe("auditDocument", () => {
  it("passes a complete, secure document and leaves manual testing open", () => {
    const { checks, findings } = auditDocument({
      url: "https://example.com/",
      headers: SECURE,
      html: COMPLETE,
    });
    expect(
      checks.filter((check) => check.status !== "Passed").map((c) => c.name),
    ).toEqual(["Manual testing"]);
    expect(findings).toEqual([]);
    expect(checks.find((check) => check.name === "Page title")?.detail).toBe(
      "Example Domain",
    );
  });

  it("reports missing headers and metadata as findings with evidence", () => {
    const { checks, findings } = auditDocument({
      url: "http://example.com/",
      headers: { "content-security-policy-report-only": "default-src 'self'" },
      html: "<html><body><p>Hi</p></body></html>",
    });
    expect(status(checks, "HTTPS")).toBe("Review");
    expect(
      checks.find((check) => check.name === "Content-Security-Policy")?.detail,
    ).toMatch(/report-only/);
    expect(findings.map((finding) => finding.title)).toEqual([
      "Page is served without HTTPS",
      "Document language is not declared",
      "Page has no title",
      "HSTS is not configured",
      "Content Security Policy is not enforced",
      "MIME type sniffing is not disabled",
      "Page can be embedded by other sites",
      "Meta description is missing",
      "Canonical URL is not declared",
    ]);
    expect(findings[0]).toMatchObject({
      severity: "warning",
      tag: "Security",
      detail: "Final URL uses HTTP: http://example.com/",
    });
  });

  it("counts images without alt text or dimensions", () => {
    const { checks, findings } = auditDocument({
      url: "https://example.com/",
      headers: SECURE,
      html: `<html lang="en"><img src="a.png"><img src='b.png' alt=''><img src=c.png alt="C" width=1 height=1>
        <script>document.write('<img src="x.png">')</script><!-- <img src="y.png"> --></html>`,
    });
    expect(
      checks.find((check) => check.name === "Image alternative text")?.detail,
    ).toBe("1 of 3 images in the HTML have no alt attribute");
    expect(
      checks.find((check) => check.name === "Image dimensions")?.detail,
    ).toBe("2 of 3 images in the HTML lack width or height attributes");
    expect(findings.map((finding) => finding.title)).toContain(
      "1 image is missing alternative text",
    );
  });

  it("flags noindex from the robots meta tag or header", () => {
    const meta = auditDocument({
      url: "https://example.com/",
      headers: SECURE,
      html: '<meta content="noindex, follow" name="robots">',
    });
    expect(status(meta.checks, "Robots directives")).toBe("Review");
    const header = auditDocument({
      url: "https://example.com/",
      headers: { ...SECURE, "x-robots-tag": "noindex" },
      html: COMPLETE,
    });
    expect(status(header.checks, "Robots directives")).toBe("Review");
  });

  it("decodes character references in metadata", () => {
    const { checks } = auditDocument({
      url: "https://example.com/",
      headers: SECURE,
      html: `<title>Tom &amp; Jerry&#x2019;s</title><meta name="description" content="The world&#39;s &quot;best&quot;">`,
    });
    expect(checks.find((check) => check.name === "Page title")?.detail).toBe(
      "Tom & Jerry’s",
    );
    expect(
      checks.find((check) => check.name === "Meta description")?.detail,
    ).toBe('18 characters: The world\'s "best"');
  });

  it("accepts X-Frame-Options as framing protection", () => {
    const { checks } = auditDocument({
      url: "https://example.com/",
      headers: { "x-frame-options": "DENY" },
      html: COMPLETE,
    });
    expect(
      checks.find((check) => check.name === "Framing protection")?.detail,
    ).toBe("X-Frame-Options: DENY");
  });
});
