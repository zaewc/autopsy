import { describe, expect, it } from "vitest";
import { detectTechnologies } from "./detectTechnologies";

const detect = (headers: Record<string, string>, html = "") =>
  detectTechnologies({ headers, html });
const names = (headers: Record<string, string>, html = "") =>
  detect(headers, html).map(({ name }) => name);

describe("detectTechnologies", () => {
  it("does not report Next.js for a document without Next.js signals", () => {
    const found = names(
      { server: "github.com", "x-github-request-id": "ABCD" },
      `<html lang="en"><head>
        <script src="https://github.githubassets.com/assets/app.js"></script>
      </head><body><p>Read about /_next/static/ and __NEXT_DATA__.</p></body></html>`,
    );
    expect(found).not.toContain("Next.js");
    expect(found).not.toContain("React");
    expect(found).toContain("GitHub");
  });

  it("detects Next.js from its asset paths and infers React", () => {
    const technologies = detect(
      { "x-vercel-id": "icn1::abc", server: "Vercel" },
      `<script src="/_next/static/chunks/main-app.js" async></script>`,
    );
    expect(technologies).toContainEqual({
      name: "Next.js",
      version: "",
      type: "Framework",
      evidence:
        'Next.js static asset path in the HTML document: src="/_next/static/chunks/main-app.js"',
      basis: "Observed",
    });
    expect(technologies.find(({ name }) => name === "React")).toMatchObject({
      basis: "Inferred",
    });
    expect(technologies.find(({ name }) => name === "Vercel")?.evidence).toBe(
      "Response header x-vercel-id: icn1::abc",
    );
  });

  it("keeps a direct React signal observed", () => {
    const react = detect(
      {},
      `<div id="___gatsby"></div><script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js"></script>`,
    ).filter(({ name }) => name === "React");
    expect(react).toEqual([
      expect.objectContaining({ basis: "Observed", version: "18.3.1" }),
    ]);
  });

  it("reads versions from headers, generators, and attributes", () => {
    const technologies = detect(
      { "x-powered-by": "PHP/8.2.12", server: "nginx/1.25.3" },
      `<meta content="WordPress 6.4.2" name="generator"><app-root ng-version="17.0.5"></app-root>`,
    );
    const version = (name: string) =>
      technologies.find((technology) => technology.name === name)?.version;
    expect(version("PHP")).toBe("8.2.12");
    expect(version("nginx")).toBe("1.25.3");
    expect(version("WordPress")).toBe("6.4.2");
    expect(version("Angular")).toBe("17.0.5");
  });

  it("detects CDN, hosting, and third-party scripts", () => {
    const found = names(
      { "cf-ray": "8a-ICN", "x-amz-cf-id": "x" },
      `<script async src="https://www.googletagmanager.com/gtag/js?id=G-1"></script>
       <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lora">
       <script src="https://js.stripe.com/v3/"></script>`,
    );
    expect(found).toEqual(
      expect.arrayContaining([
        "Cloudflare",
        "Amazon CloudFront",
        "Google Analytics",
        "Google Fonts",
        "Stripe",
      ]),
    );
  });

  it("returns nothing when no rule matches", () => {
    expect(detect({ "content-type": "text/html" }, "<p>Hello</p>")).toEqual([]);
  });

  it("truncates long evidence", () => {
    const [technology] = detect({ "x-nextjs-cache": "HIT".repeat(80) });
    expect(technology.evidence.length).toBeLessThan(160);
    expect(technology.evidence.endsWith("…")).toBe(true);
  });
});
