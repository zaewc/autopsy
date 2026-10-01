import { describe, expect, it } from "vitest";
import { analyzeContent } from "./analyzeContent";

const URL = "https://shop.site.test/";

describe("analyzeContent", () => {
  it("separates blocking and passive mixed content from browser requests", () => {
    const { issues } = analyzeContent({
      url: URL,
      html: "",
      requests: [
        { url: "http://cdn.test/app.js", type: "script" },
        { url: "http://cdn.test/hero.jpg", type: "image" },
        { url: "https://cdn.test/safe.js", type: "script" },
      ],
    });
    expect(issues.map(({ id, severity }) => `${id}:${severity}`)).toEqual([
      "content-mixed-active:high",
      "content-mixed-passive:low",
    ]);
    expect(issues[0].evidence).toBe(
      "HTTP URLs requested by the page: http://cdn.test/app.js",
    );
  });

  it("falls back to HTML references without a browser stage", () => {
    const { issues } = analyzeContent({
      url: URL,
      html: '<script src="http://cdn.test/a.js"></script><!-- <img src="http://x.test/y.png"> -->',
    });
    expect(issues.map(({ id }) => id)).toEqual([
      "content-mixed-active",
      "content-sri",
    ]);
  });

  it("groups third-party scripts and reports those without integrity", () => {
    const { issues, thirdPartyScripts } = analyzeContent({
      url: URL,
      html: `
        <script src="/local.js"></script>
        <script src="https://static.site.test/same-site.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/a@1/a.js" integrity="sha384-x" crossorigin></script>
        <script src="https://cdn.jsdelivr.net/npm/b@1/b.js"></script>
        <script src="https://www.googletagmanager.com/gtm.js?id=G"></script>`,
    });
    expect(thirdPartyScripts).toEqual([
      { origin: "https://cdn.jsdelivr.net", count: 2, withIntegrity: 1 },
      {
        origin: "https://www.googletagmanager.com",
        count: 1,
        withIntegrity: 0,
      },
    ]);
    expect(issues).toEqual([
      expect.objectContaining({
        id: "content-sri",
        title: "2 third-party scripts have no integrity check",
      }),
    ]);
  });

  it("flags forms that submit over HTTP", () => {
    const { issues } = analyzeContent({
      url: URL,
      html: '<form action="http://login.site.test/session"></form><form action="/search"></form>',
    });
    expect(issues).toEqual([
      expect.objectContaining({ id: "content-form-http", severity: "medium" }),
    ]);
  });

  it("does not report mixed content on HTTP pages", () => {
    expect(
      analyzeContent({
        url: "http://site.test/",
        html: '<img src="http://site.test/a.png">',
      }).issues,
    ).toEqual([]);
  });
});
