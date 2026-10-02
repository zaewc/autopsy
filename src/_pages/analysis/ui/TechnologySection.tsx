"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { TechnologyLogo, type Technology } from "@/entities/analysis-report";
import { useMessages, type Localized } from "@/shared/lib/i18n";
import { SectionHeading } from "@/shared/ui/section-heading";

const MESSAGES: Localized<{
  title: string;
  count: (count: number, live: boolean) => string;
  inspect: string;
  technology: string;
  role: string;
  basis: string;
  bases: Readonly<Record<Technology["basis"], string>>;
  evidence: (name: string, live: boolean) => string;
  empty: string;
}> = {
  en: {
    title: "Technology stack",
    count: (count, live) => `${count} ${live ? "detected" : "examples"}`,
    inspect: " · select to inspect",
    technology: "Technology",
    role: "Role",
    basis: "Basis",
    bases: { Observed: "Observed", Inferred: "Inferred" },
    evidence: (name, live) =>
      `${name} · ${live ? "evidence" : "sample evidence"}`,
    empty:
      "No known technology signatures were found in the response headers, the HTML document, or the page the browser rendered. Bundled code without public markers or globals cannot be identified.",
  },
  ko: {
    title: "기술 스택",
    count: (count, live) => (live ? `${count}개 감지` : `예시 ${count}개`),
    inspect: " · 선택해 근거 보기",
    technology: "기술",
    role: "역할",
    basis: "근거 유형",
    bases: { Observed: "관측", Inferred: "추론" },
    evidence: (name, live) => `${name} · ${live ? "근거" : "샘플 근거"}`,
    empty:
      "응답 헤더, HTML 문서, 브라우저가 렌더링한 페이지에서 알려진 기술 시그니처를 찾지 못했습니다. 공개 표식이나 전역 변수가 없는 번들 코드는 식별할 수 없습니다.",
  },
};
export function TechnologySection({
  technologies,
  live,
}: {
  technologies: readonly Technology[];
  live: boolean;
}) {
  const t = useMessages(MESSAGES);
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <section>
      <SectionHeading title={t.title}>
        <span className="muted-caption">
          {t.count(technologies.length, live)}
          {technologies.length > 0 && t.inspect}
        </span>
      </SectionHeading>
      <div className="technology-list">
        <div className="technology-columns" aria-hidden="true">
          <span>{t.technology}</span>
          <span>{t.role}</span>
          <span>{t.basis}</span>
        </div>
        {technologies.map((technology) => (
          <div className="technology-item" key={technology.name}>
            <button
              className="technology-row"
              aria-expanded={expanded === technology.name}
              aria-controls={`evidence-${technology.name}`}
              onClick={() =>
                setExpanded(
                  expanded === technology.name ? null : technology.name,
                )
              }
            >
              <span className="technology-name">
                <TechnologyLogo name={technology.name} />
                {technology.name}
                <small>{technology.version}</small>
              </span>
              <span className="technology-role">
                {technology.type.replace(" · inferred", "")}
              </span>
              <span className="technology-basis">
                {t.bases[technology.basis]}
                <ChevronDown
                  size={14}
                  className={expanded === technology.name ? "rotated" : ""}
                />
              </span>
            </button>
            {expanded === technology.name && (
              <div id={`evidence-${technology.name}`} className="evidence">
                <strong>{t.evidence(technology.name, live)}</strong>
                <p>{technology.evidence}</p>
              </div>
            )}
          </div>
        ))}
        {technologies.length === 0 && <p className="empty-note">{t.empty}</p>}
      </div>
    </section>
  );
}
