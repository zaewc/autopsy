import { expect, it } from "vitest";
import type { SecurityIssue } from "../model/types";
import { securityFindings } from "./securityFindings";

const issue = (
  id: string,
  severity: SecurityIssue["severity"],
): SecurityIssue => ({
  id,
  severity,
  category: "Headers",
  title: id,
  evidence: `${id} evidence`,
  impact: "impact",
  fix: "fix",
  references: [],
});

it("maps severities and keeps info notes out of findings", () => {
  expect(
    securityFindings([
      issue("a", "high"),
      issue("b", "medium"),
      issue("c", "low"),
      issue("d", "info"),
    ]).map(({ title, severity, tag }) => `${title}:${severity}:${tag}`),
  ).toEqual(["a:warning:Security", "b:warning:Security", "c:info:Security"]);
});
