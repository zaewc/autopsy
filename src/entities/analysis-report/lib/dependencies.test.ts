import { describe, expect, it } from "vitest";
import type { Technology } from "../model/types";
import {
  advisorySeverity,
  dependencyIssues,
  dependencyQueries,
} from "./dependencies";

const tech = (
  name: string,
  version: string,
  basis: Technology["basis"] = "Observed",
): Technology => ({
  name,
  version,
  basis,
  type: "Library",
  evidence: "",
});

describe("dependencies", () => {
  it("queries only observed technologies with exact versions", () => {
    expect(
      dependencyQueries([
        tech("jQuery", "3.4.1"),
        tech("Angular", "22.2.1+sha-fb7711f"),
        tech("Three.js", "148"),
        tech("Svelte", "5"),
        tech("React", ""),
        tech("React", "18.3.1", "Inferred"),
        tech("GitHub", "1.0.0"),
      ]),
    ).toEqual([
      {
        technology: "jQuery",
        ecosystem: "npm",
        name: "jquery",
        version: "3.4.1",
      },
      {
        technology: "Angular",
        ecosystem: "npm",
        name: "@angular/core",
        version: "22.2.1",
      },
      {
        technology: "Three.js",
        ecosystem: "npm",
        name: "three",
        version: "0.148.0",
      },
    ]);
  });

  it("maps advisory labels to severities", () => {
    expect(
      ["CRITICAL", "HIGH", "MODERATE", "LOW", null].map(advisorySeverity),
    ).toEqual(["high", "high", "medium", "low", "medium"]);
  });

  it("groups advisories per package with the worst severity and newest fix", () => {
    const base = {
      technology: "jQuery",
      packageName: "jquery",
      version: "3.4.1",
      summary: "Potential XSS vulnerability in jQuery",
      url: "https://osv.dev/vulnerability/GHSA-1",
    };
    const [issue] = dependencyIssues([
      {
        ...base,
        id: "GHSA-1",
        aliases: ["CVE-2020-11022"],
        severity: "medium",
        fixed: "3.5.0",
      },
      { ...base, id: "GHSA-2", aliases: [], severity: "high", fixed: "3.5.1" },
    ]);
    expect(issue).toMatchObject({
      id: "dependency-jquery",
      category: "Dependencies",
      severity: "high",
      title: "jQuery 3.4.1 has 2 known vulnerabilities",
      evidence:
        "jquery@3.4.1 matches CVE-2020-11022, GHSA-2 in OSV.dev. The version was observed on the page.",
    });
    expect(issue.fix).toMatch(/^Upgrade jquery to 3\.5\.1 or later/);
  });
});

describe("dependencyIssues in Korean", () => {
  it("translates the title, evidence, and fix", () => {
    const [issue] = dependencyIssues(
      [
        {
          technology: "jQuery",
          packageName: "jquery",
          version: "3.4.1",
          id: "GHSA-1",
          aliases: ["CVE-2020-11022"],
          summary: null,
          severity: "medium",
          fixed: "3.5.0",
          url: "https://osv.dev/vulnerability/GHSA-1",
        },
      ],
      "ko",
    );
    expect(issue.title).toBe("jQuery 3.4.1에 알려진 취약점 1개");
    expect(issue.evidence).toContain(
      "jquery@3.4.1가 CVE-2020-11022에 해당합니다",
    );
    expect(issue.impact).toBe("영향받는 기능과 조건은 advisory를 확인하세요.");
    expect(issue.fix).toMatch(/^jquery를 3\.5\.0 이상으로/);
  });
});
