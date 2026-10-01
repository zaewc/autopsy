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

  describe("with browser signals", () => {
    const rendered = (
      html: string,
      runtime: Record<string, string> = {},
      requests: string[] = [],
    ) => ({ html, runtime, requests });

    it("finds client-rendered markup only present after scripts ran", () => {
      const [angular] = detectTechnologies({
        headers: {},
        html: "<app-root></app-root>",
        rendered: rendered(
          '<app-root ng-version="19.2.0"><h1>Hi</h1></app-root>',
        ),
      });
      expect(angular).toMatchObject({
        name: "Angular",
        version: "19.2.0",
        evidence:
          'ng-version attribute in the rendered DOM: ng-version="19.2.0"',
      });
    });

    it("reads runtime globals and keeps React observed instead of inferred", () => {
      const technologies = detectTechnologies({
        headers: { "x-powered-by": "Next.js" },
        html: "",
        rendered: rendered("", { next: "15.1.0", react: "present" }),
      });
      expect(
        technologies.find(({ name }) => name === "Next.js")?.evidence,
      ).toBe("Response header x-powered-by: Next.js");
      expect(technologies.find(({ name }) => name === "React")).toMatchObject({
        basis: "Observed",
        evidence: "React fiber on DOM nodes after scripts ran",
      });
    });

    it("detects runtime-only technologies with versions", () => {
      const found = detectTechnologies({
        headers: {},
        html: "",
        rendered: rendered("", { svelte: "5", htmx: "2.0.4" }),
      });
      expect(found.map(({ name, version }) => `${name}@${version}`)).toEqual([
        "Svelte@5",
        "htmx@2.0.4",
      ]);
    });

    it("detects libraries and services seen on github.com and shopify.com", () => {
      const found = detectTechnologies({
        headers: {},
        html: "",
        rendered: rendered(
          "",
          {
            reactRouter: "7.9.1",
            tanstackQuery: "present",
            zod: "present",
            three: "180",
            gsap: "3.13.0",
            tealium: "present",
          },
          [
            "https://images.ctfassets.net/8aevphvgewt8/hero.webp",
            "https://connect.facebook.net/en_US/fbevents.js",
            "https://snap.licdn.com/li.lms-analytics/insight.min.js",
            "https://o205439.ingest.us.sentry.io/api/1/envelope/",
          ],
        ),
      }).map(({ name, version }) => (version ? `${name}@${version}` : name));
      expect(found).toEqual(
        expect.arrayContaining([
          "React Router@7.9.1",
          "React Query",
          "Zod",
          "Three.js@180",
          "GSAP@3.13.0",
          "Tealium",
          "Contentful",
          "Meta Pixel",
          "LinkedIn Insight Tag",
          "Sentry",
        ]),
      );
    });

    it("detects third-party scripts injected at runtime from requests", () => {
      const [analytics] = detectTechnologies({
        headers: {},
        html: "",
        rendered: rendered("", {}, [
          "https://www.googletagmanager.com/gtag/js?id=G-1",
        ]),
      });
      expect(analytics).toMatchObject({
        name: "Google Analytics",
        evidence:
          'gtag.js script in a network request: src="https://www.googletagmanager.com/gtag/js?id=G-1"',
      });
    });
  });
});
