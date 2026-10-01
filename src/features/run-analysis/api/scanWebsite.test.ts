import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchPublicDocument, PublicFetchError } = vi.hoisted(() => ({
  fetchPublicDocument: vi.fn(),
  PublicFetchError: class extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
}));
vi.mock("@/shared/lib/public-http/index.server", () => ({
  fetchPublicDocument,
  PublicFetchError,
}));

const { scanWebsite, ScanError } = await import("./scanWebsite");

function respond(document: object) {
  fetchPublicDocument.mockResolvedValue({
    url: "https://github.com/",
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
    body: "",
    redirects: [],
    responseMs: 120,
    bytes: 0,
    truncated: false,
    ...document,
  });
}

async function failure(input: string) {
  const error = await scanWebsite(input).catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(ScanError);
  return (error as InstanceType<typeof ScanError>).code;
}

describe("scanWebsite", () => {
  // A returned function would run as teardown, so do not return the mock.
  beforeEach(() => {
    fetchPublicDocument.mockReset();
  });

  it("builds a live report from the fetched document", async () => {
    const body = `<html lang="en"><title>GitHub</title>
      <link rel="stylesheet" href="/a.css"><script src="/a.js"></script><img src="x.png" alt="">`;
    respond({
      body,
      bytes: body.length,
      redirects: ["http://github.com/"],
      headers: {
        "content-type": "text/html; charset=utf-8",
        server: "github.com",
        "set-cookie":
          "_gh_sess=secret; path=/, _octo=GH1.1; expires=Thu, 01 Oct 2027 00:00:00 GMT",
      },
    });
    const report = await scanWebsite("github.com");
    expect(fetchPublicDocument.mock.calls[0][0].href).toBe(
      "https://github.com/",
    );
    expect(report).toMatchObject({
      mode: "live",
      domain: "github.com",
      url: "https://github.com/",
      document: {
        status: 200,
        responseMs: 120,
        redirects: ["http://github.com/"],
        resources: { scripts: 1, stylesheets: 1, images: 1 },
      },
    });
    expect(report.technologies.map(({ name }) => name)).toEqual(["GitHub"]);
    expect(report.document?.headers["set-cookie"]).toBe(
      "2 cookie(s); values omitted",
    );
    expect(JSON.stringify(report)).not.toContain("secret");
    expect(Date.parse(report.scannedAt ?? "")).not.toBeNaN();
    expect(report.notice).toMatch(/Scripts were not executed/);
  });

  it("explains non-success responses and truncation in the notice", async () => {
    respond({ status: 403, truncated: true, bytes: 2_000_000 });
    const { notice } = await scanWebsite("https://example.com");
    expect(notice).toMatch(/HTTP 403/);
    expect(notice).toMatch(/first 2000 kB/);
  });

  it("rejects invalid input before fetching", async () => {
    expect(await failure("not a url")).toBe("invalid-url");
    expect(fetchPublicDocument).not.toHaveBeenCalled();
  });

  it("rejects documents that are not HTML", async () => {
    respond({ headers: { "content-type": "application/pdf" } });
    expect(await failure("example.com/file.pdf")).toBe("not-html");
  });

  it("passes fetch failure codes through", async () => {
    fetchPublicDocument.mockImplementation(async () => {
      throw new PublicFetchError("blocked", "10.0.0.1 is not public.");
    });
    expect(await failure("internal.example.com")).toBe("blocked");
  });
});
