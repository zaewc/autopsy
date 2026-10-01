import { describe, expect, it, vi } from "vitest";
import { queryOsv } from "./queryOsv";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

describe("queryOsv", () => {
  it("batches queries and fills in details in order", async () => {
    const fetch = vi.fn(
      async (url: string | URL | Request, init?: RequestInit) => {
        const target = String(url);
        if (target.endsWith("/querybatch")) {
          expect(JSON.parse(String(init?.body))).toEqual({
            queries: [
              {
                package: { ecosystem: "npm", name: "jquery" },
                version: "3.4.1",
              },
              {
                package: { ecosystem: "npm", name: "react" },
                version: "18.3.1",
              },
            ],
          });
          return json({ results: [{ vulns: [{ id: "GHSA-1" }] }, {}] });
        }
        return json({
          id: "GHSA-1",
          aliases: ["CVE-2020-11022"],
          summary: "Potential XSS vulnerability in jQuery",
          database_specific: { severity: "MODERATE" },
          affected: [
            {
              package: { name: "jquery", ecosystem: "npm" },
              ranges: [{ events: [{ introduced: "1.2" }, { fixed: "3.5.0" }] }],
            },
          ],
        });
      },
    );
    const results = await queryOsv(
      [
        { ecosystem: "npm", name: "jquery", version: "3.4.1" },
        { ecosystem: "npm", name: "react", version: "18.3.1" },
      ],
      { fetch: fetch as typeof globalThis.fetch },
    );
    expect(results).toEqual([
      [
        {
          id: "GHSA-1",
          aliases: ["CVE-2020-11022"],
          summary: "Potential XSS vulnerability in jQuery",
          severity: "MODERATE",
          fixed: "3.5.0",
          url: "https://osv.dev/vulnerability/GHSA-1",
        },
      ],
      [],
    ]);
  });

  it("keeps ids without details once the detail budget is spent", async () => {
    const fetch = vi.fn(async (url: string | URL | Request) =>
      String(url).endsWith("/querybatch")
        ? json({ results: [{ vulns: [{ id: "A" }, { id: "B" }] }] })
        : json({ id: "A", summary: "first" }),
    );
    const [found] = await queryOsv(
      [{ ecosystem: "npm", name: "x", version: "1.0.0" }],
      { fetch: fetch as typeof globalThis.fetch, maxDetails: 1 },
    );
    expect(found.map(({ id, summary }) => `${id}:${summary}`)).toEqual([
      "A:first",
      "B:null",
    ]);
  });

  it("does not call the API without queries and fails on API errors", async () => {
    const fetch = vi.fn(async () => json({}, 500));
    expect(
      await queryOsv([], { fetch: fetch as typeof globalThis.fetch }),
    ).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
    await expect(
      queryOsv([{ ecosystem: "npm", name: "x", version: "1.0.0" }], {
        fetch: fetch as typeof globalThis.fetch,
      }),
    ).rejects.toThrow("HTTP 500");
  });
});
