import { describe, expect, it } from "vitest";
import { createSampleReport } from "../model/sampleReport";
import type { AnalysisReport, Technology } from "../model/types";
import { architectureNodes } from "./architectureNodes";

const tech = (
  name: string,
  type: string,
  basis: Technology["basis"] = "Observed",
): Technology => ({
  name,
  type,
  basis,
  version: "",
  evidence: `${name} signal`,
});
const live = (technologies: Technology[]): AnalysisReport => ({
  ...createSampleReport(),
  mode: "live",
  domain: "site.test",
  url: "https://site.test/",
  technologies,
});

describe("architectureNodes", () => {
  it("draws observed layers in request order and ends at an unknown origin", () => {
    const nodes = architectureNodes(
      live([
        tech("Next.js", "Framework"),
        tech("React", "UI library", "Inferred"),
        tech("Vercel", "Hosting"),
        tech("Cloudflare", "CDN"),
        tech("Fastly", "CDN"),
        tech("Google Fonts", "Fonts"),
      ]),
    );
    expect(nodes.map(({ name, basis }) => `${name}:${basis}`)).toEqual([
      "Request:Observed",
      "Cloudflare, Fastly:Observed",
      "Vercel:Observed",
      "Next.js:Observed",
      "Origin services:Unknown",
    ]);
    expect(nodes[1].evidence).toBe(
      "Cloudflare: Cloudflare signal Fastly: Fastly signal",
    );
  });

  it("does not draw inferred technologies or invent layers", () => {
    const nodes = architectureNodes(
      live([tech("React", "Framework", "Inferred")]),
    );
    expect(nodes.map(({ name }) => name)).toEqual([
      "Request",
      "Origin services",
    ]);
  });

  it("keeps the illustrative sample path for sample reports", () => {
    expect(
      architectureNodes(createSampleReport()).map(({ name }) => name),
    ).toEqual(["Browser", "Cloudflare", "Next.js", "External API"]);
  });
});
