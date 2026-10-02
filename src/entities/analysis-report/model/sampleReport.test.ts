import { expect, it } from "vitest";
import { createSampleReport } from "./sampleReport";

it("builds the same sample structure in every locale", () => {
  const english = createSampleReport();
  const korean = createSampleReport("ko");
  const shape = (report: typeof english) => ({
    mode: report.mode,
    domain: report.domain,
    technologies: report.technologies.map(({ name, version, type, basis }) => [
      name,
      version,
      type,
      basis,
    ]),
    findings: report.findings.map(({ severity, tag }) => [severity, tag]),
    checks: report.checks.map(({ area, status }) => [area, status]),
  });
  expect(shape(korean)).toEqual(shape(english));
  expect(korean.notice).toBe(
    "예시 샘플이며 실제 웹사이트를 스캔하지 않았습니다.",
  );
  expect(korean.findings[0].title).toBe(
    "JavaScript payload를 줄일 수 있습니다",
  );
});
