import { describe, expect, it } from "vitest";
import { analyzeSecurity } from "./analyzeSecurity";

const NOW = new Date("2026-10-01T00:00:00Z");
const TLS = {
  protocol: "TLSv1.3",
  cipher: "TLS_AES_128_GCM_SHA256",
  authorized: true,
  certificate: {
    subject: "site.test",
    issuer: "Example CA",
    names: ["site.test"],
    validFrom: "2026-09-01T00:00:00.000Z",
    validTo: "2027-01-01T00:00:00.000Z",
  },
};
const HARDENED = {
  "strict-transport-security": "max-age=63072000; includeSubDomains; preload",
  "content-security-policy":
    "default-src 'self'; script-src 'nonce-abc' 'strict-dynamic'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=()",
  "cross-origin-opener-policy": "same-origin",
};
const ids = (
  headers: Record<string, string>,
  setCookies: string[] = [],
  tls = TLS,
) =>
  analyzeSecurity({
    url: "https://site.test/",
    headers,
    setCookies,
    tls,
    now: NOW,
  }).issues.map(({ id }) => id);

describe("analyzeSecurity", () => {
  it("finds nothing in a hardened response", () => {
    const result = analyzeSecurity({
      url: "https://site.test/",
      headers: HARDENED,
      setCookies: [
        "__Host-session=secret; Path=/; Secure; HttpOnly; SameSite=Lax",
      ],
      tls: TLS,
      now: NOW,
    });
    expect(result.issues).toEqual([]);
    expect(result.cookies).toEqual([
      {
        name: "__Host-session",
        secure: true,
        httpOnly: true,
        sameSite: "Lax",
        domain: null,
        path: "/",
        persistent: false,
      },
    ]);
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(result.csp?.directives.map(({ name }) => name)).toEqual([
      "default-src",
      "script-src",
      "object-src",
      "base-uri",
      "frame-ancestors",
    ]);
  });

  it("reports missing protections, sorted by severity", () => {
    const found = analyzeSecurity({
      url: "http://site.test/",
      headers: {},
      setCookies: [],
      tls: null,
      now: NOW,
    }).issues;
    expect(found[0]).toMatchObject({ id: "transport-http", severity: "high" });
    expect(found.map(({ id }) => id)).toEqual(
      expect.arrayContaining([
        "csp-missing",
        "headers-framing",
        "headers-nosniff",
      ]),
    );
    expect(found.map(({ id }) => id)).not.toContain("headers-hsts-missing");
  });

  it("explains weak Content Security Policies", () => {
    expect(
      ids({
        ...HARDENED,
        "content-security-policy":
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
      }),
    ).toEqual(
      expect.arrayContaining([
        "csp-unsafe-inline",
        "csp-unsafe-eval",
        "csp-broad-sources",
        "csp-object-src",
        "csp-base-uri",
        "headers-framing",
      ]),
    );
    expect(
      ids({
        ...HARDENED,
        "content-security-policy":
          "script-src 'nonce-a' 'unsafe-inline'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'",
      }),
    ).toEqual([]);
  });

  it("checks HSTS strength, TLS version, and certificate expiry", () => {
    const found = ids(
      { ...HARDENED, "strict-transport-security": "max-age=86400" },
      [],
      {
        ...TLS,
        protocol: "TLSv1.1",
        certificate: {
          ...TLS.certificate,
          validTo: "2026-10-10T00:00:00.000Z",
        },
      },
    );
    expect(found).toEqual(
      expect.arrayContaining([
        "transport-old-tls",
        "transport-certificate-expiry",
        "headers-hsts-short",
        "headers-hsts-subdomains",
      ]),
    );
  });

  it("reviews cookie attributes without keeping values", () => {
    const found = ids(HARDENED, [
      "sid=abc123; Path=/",
      "track=1; SameSite=None",
      "__Host-x=1; Secure; Path=/app",
    ]);
    expect(found).toEqual(
      expect.arrayContaining([
        "cookie-secure-sid",
        "cookie-samesite-sid",
        "cookie-httponly-sid",
        "cookie-samesite-none-track",
        "cookie-host-prefix-__Host-x",
      ]),
    );
  });

  it("flags version disclosure and permissive CORS", () => {
    const found = ids({
      ...HARDENED,
      server: "nginx/1.18.0",
      "x-powered-by": "PHP/7.4.3",
      "access-control-allow-origin": "*",
    });
    expect(found).toEqual(
      expect.arrayContaining([
        "disclosure-server",
        "disclosure-x-powered-by",
        "headers-cors-wildcard",
      ]),
    );
    expect(ids({ ...HARDENED, server: "cloudflare" })).toEqual([]);
  });
});

describe("analyzeSecurity in Korean", () => {
  it("keeps ids, severities, and references and translates the text", () => {
    const input = {
      url: "http://site.test/",
      headers: {
        "content-security-policy-report-only":
          "script-src * 'unsafe-inline' 'unsafe-eval'",
        "x-xss-protection": "1; mode=block",
        "referrer-policy": "unsafe-url",
        "access-control-allow-origin": "*",
        "access-control-allow-credentials": "true",
        "x-powered-by": "PHP/8.1",
      },
      setCookies: ["sid=secret; SameSite=None", "__Host-a=1; Path=/x"],
      tls: {
        ...TLS,
        protocol: "TLSv1",
        certificate: { ...TLS.certificate!, validTo: "2026-10-10T00:00:00Z" },
      },
      now: NOW,
    };
    const english = analyzeSecurity(input).issues;
    const korean = analyzeSecurity({ ...input, locale: "ko" }).issues;
    const shape = (issues: typeof english) =>
      issues.map(({ id, category, severity, references }) => ({
        id,
        category,
        severity,
        references,
      }));
    expect(shape(korean)).toEqual(shape(english));
    for (const [index, issue] of korean.entries()) {
      expect(issue.title).not.toBe(english[index].title);
      expect(issue.impact).not.toBe(english[index].impact);
      expect(issue.fix).not.toBe(english[index].fix);
      expect(JSON.stringify(issue)).not.toMatch(/undefined|secret/);
    }
    expect(korean.map(({ title }) => title)).toContain(
      "페이지가 HTTPS 없이 제공됩니다",
    );
  });
});
