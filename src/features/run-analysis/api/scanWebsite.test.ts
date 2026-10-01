import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchPublicDocument, PublicFetchError, renderPage, RenderError } =
  vi.hoisted(() => {
    class CodedError extends Error {
      code: string;
      constructor(code: string, message: string) {
        super(message);
        this.code = code;
      }
    }
    return {
      fetchPublicDocument: vi.fn(),
      PublicFetchError: class extends CodedError {},
      renderPage: vi.fn(),
      RenderError: class extends CodedError {},
    };
  });
vi.mock("@/shared/lib/public-http/index.server", () => ({
  fetchPublicDocument,
  PublicFetchError,
  isPublicAddress: () => true,
}));
vi.mock("@/shared/lib/osv/index.server", () => ({
  queryOsv: vi.fn(async () => [[]]),
}));
vi.mock("@/shared/lib/rendered-page/index.server", () => ({
  renderPage,
  RenderError,
}));

const RENDERED = {
  url: "https://github.com/",
  html: '<div id="root"></div>',
  truncated: false,
  requests: [
    {
      url: "https://github.com/",
      type: "document",
      status: 200,
      bytes: 1000,
      startMs: 0,
      durationMs: 300,
      failure: null,
    },
    {
      url: "https://www.googletagmanager.com/gtag/js?id=G-1",
      type: "script",
      status: 200,
      bytes: 5000,
      startMs: 320,
      durationMs: 80,
      failure: null,
    },
  ],
  requestsTruncated: false,
  vitals: { ttfbMs: 200, fcpMs: 500, lcpMs: 900, cls: 0.01 },
  consoleErrors: 1,
  blocked: ["10.0.0.1:80"],
  probe: { react: "present" },
};

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
    setCookies: [],
    tls: null,
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
    renderPage.mockReset();
    renderPage.mockRejectedValue(
      new RenderError(
        "unavailable",
        "The scanning browser could not be started.",
      ),
    );
  });

  it("adds browser observations and runtime technologies", async () => {
    respond({ headers: { "content-type": "text/html", server: "github.com" } });
    renderPage.mockResolvedValue(RENDERED);
    const report = await scanWebsite("github.com");
    expect(renderPage.mock.calls[0][0]).toBe("https://github.com/");
    expect(report.technologies.map(({ name }) => name)).toEqual([
      "React",
      "GitHub",
      "Google Analytics",
    ]);
    expect(report.browser).toMatchObject({
      vitals: { lcpMs: 900 },
      consoleErrors: 1,
      blocked: ["10.0.0.1:80"],
    });
    expect(report.browser?.requests).toHaveLength(2);
    expect(report.notice).toMatch(/headless Chromium with scripts running/);
  });

  it("adds a passive security review without cookie values", async () => {
    respond({
      headers: { "content-type": "text/html" },
      setCookies: ["session=secret; Path=/"],
      tls: {
        protocol: "TLSv1.3",
        cipher: "TLS_AES_128_GCM_SHA256",
        authorized: true,
        certificate: null,
      },
    });
    const report = await scanWebsite("github.com");
    expect(fetchPublicDocument.mock.calls[1][0]).toBe(
      "https://github.com/.well-known/security.txt",
    );
    expect(report.security?.tls?.protocol).toBe("TLSv1.3");
    expect(report.security?.cookies.map(({ name }) => name)).toEqual([
      "session",
    ]);
    expect(report.security?.issues.map(({ id }) => id)).toEqual(
      expect.arrayContaining([
        "cookie-secure-session",
        "csp-missing",
        "disclosure-security-txt-missing",
      ]),
    );
    expect(report.security?.dependencyCheck).toEqual({
      checked: [],
      status: "none",
    });
    expect(JSON.stringify(report)).not.toContain("secret");
  });

  it("falls back to the HTML response when the browser stage fails", async () => {
    respond({});
    const report = await scanWebsite("github.com");
    expect(report.browser).toBeNull();
    expect(report.notice).toMatch(
      /^Browser stage unavailable: The scanning browser could not be started\./,
    );
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
    expect(report.notice).toMatch(/scripts were not executed/);
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
