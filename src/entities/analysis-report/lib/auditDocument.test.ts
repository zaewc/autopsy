import { describe, expect, it } from "vitest";
import { auditDocument } from "./auditDocument";

const SECURE = {};
const COMPLETE = `<!doctype html><html lang="en"><head>
  <title>Example Domain</title>
  <meta name="description" content="An example page.">
  <link rel="canonical" href="https://example.com/">
</head><body><img src="a.png" alt="Logo" width="10" height="10"></body></html>`;

const status = (checks: { name: string; status: string }[], name: string) =>
  checks.find((check) => check.name === name)?.status;

describe("auditDocument", () => {
  it("passes a complete document and leaves manual testing open", () => {
    const { checks, findings } = auditDocument({
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

  it("reports missing metadata as findings with evidence", () => {
    const { checks, findings } = auditDocument({
      headers: {},
      html: "<html><body><p>Hi</p></body></html>",
    });
    expect(checks.every(({ area }) => area !== "Security")).toBe(true);
    expect(findings.map((finding) => finding.title)).toEqual([
      "Document language is not declared",
      "Page has no title",
      "Meta description is missing",
      "Canonical URL is not declared",
    ]);
    expect(findings[0]).toMatchObject({
      severity: "warning",
      tag: "Accessibility",
      detail: "The html element has no lang attribute",
    });
  });

  it("counts images without alt text or dimensions", () => {
    const { checks, findings } = auditDocument({
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
      headers: SECURE,
      html: '<meta content="noindex, follow" name="robots">',
    });
    expect(status(meta.checks, "Robots directives")).toBe("Review");
    const header = auditDocument({
      headers: { ...SECURE, "x-robots-tag": "noindex" },
      html: COMPLETE,
    });
    expect(status(header.checks, "Robots directives")).toBe("Review");
  });

  it("decodes character references in metadata", () => {
    const { checks } = auditDocument({
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
});

describe("auditDocument in Korean", () => {
  it("writes the same checks and findings with Korean text", () => {
    const input = {
      headers: { "x-robots-tag": "noindex" },
      html: '<html><body><img src="a.png"><img src="b.png" alt=""></body></html>',
    };
    const english = auditDocument(input);
    const korean = auditDocument(input, "ko");
    expect(korean.checks.map(({ area, status }) => [area, status])).toEqual(
      english.checks.map(({ area, status }) => [area, status]),
    );
    expect(korean.findings.map(({ severity, tag }) => [severity, tag])).toEqual(
      english.findings.map(({ severity, tag }) => [severity, tag]),
    );
    expect(korean.checks.map(({ name }) => name)).toContain(
      "이미지 대체 텍스트",
    );
    expect(korean.findings.map(({ title }) => title)).toContain(
      "이미지 1개에 대체 텍스트가 없습니다",
    );
    expect(
      korean.checks.find(({ name }) => name === "이미지 크기")?.detail,
    ).toBe("HTML의 이미지 2개 중 2개에 width 또는 height 속성이 없습니다");
    expect(
      korean.checks.find(({ name }) => name === "Robots 지시어")?.detail,
    ).toBe("noindex가 설정됨: noindex");
  });
});
