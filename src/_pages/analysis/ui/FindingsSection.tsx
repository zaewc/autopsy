"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Finding } from "@/entities/analysis-report";
import { useMessages, type Localized } from "@/shared/lib/i18n";
import { SectionHeading } from "@/shared/ui/section-heading";
import { FINDING_SEVERITY_LABELS } from "../config/labels";
import { SECTION_LABELS, type ReportSection } from "../config/reportSections";

const FILTERS = ["All", "Warning", "Info"] as const;
const MESSAGES: Localized<{
  filters: Readonly<Record<(typeof FILTERS)[number], string>>;
  evidence: string;
  why: string;
  fix: string;
  empty: string;
}> = {
  en: {
    filters: { All: "All", Warning: "Warning", Info: "Info" },
    evidence: "Evidence",
    why: "Why it matters",
    fix: "Suggested improvement",
    empty: "No findings from the security, accessibility, and SEO checks.",
  },
  ko: {
    filters: { All: "전체", Warning: "경고", Info: "정보" },
    evidence: "근거",
    why: "중요한 이유",
    fix: "개선 제안",
    empty: "보안, 접근성, SEO 점검에서 발견 사항이 없습니다.",
  },
};
export function FindingsSection({
  findings,
}: {
  findings: readonly Finding[];
}) {
  const t = useMessages(MESSAGES);
  const sections = useMessages(SECTION_LABELS);
  const severities = useMessages(FINDING_SEVERITY_LABELS);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [expanded, setExpanded] = useState<number | null>(null);
  return (
    <section className="findings-section">
      <SectionHeading title={sections.Findings}>
        <div className="filter-buttons">
          {FILTERS.map((f) => (
            <button
              key={f}
              className={filter === f ? "active" : ""}
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {t.filters[f]}
              {f === "All" ? ` ${findings.length}` : ""}
            </button>
          ))}
        </div>
      </SectionHeading>
      <div className="findings-list">
        {findings.map(
          (f, i) =>
            (filter === "All" || filter.toLowerCase() === f.severity) && (
              <div className="finding" key={f.title}>
                <button
                  className="finding-trigger"
                  aria-expanded={expanded === i}
                  onClick={() => setExpanded(expanded === i ? null : i)}
                >
                  <span className={`severity ${f.severity}`}>
                    {severities[f.severity]}
                  </span>
                  <span className="finding-title">{f.title}</span>
                  <span className="finding-tag">
                    {sections[f.tag as ReportSection] ?? f.tag}
                  </span>
                  <ChevronDown
                    size={15}
                    className={expanded === i ? "rotated" : ""}
                  />
                </button>
                {expanded === i && (
                  <div className="finding-content">
                    <div>
                      <h3>{t.evidence}</h3>
                      <p>{f.detail}</p>
                    </div>
                    <div>
                      <h3>{t.why}</h3>
                      <p>{f.why}</p>
                    </div>
                    <div>
                      <h3>{t.fix}</h3>
                      <p>{f.fix}</p>
                    </div>
                  </div>
                )}
              </div>
            ),
        )}
        {findings.length === 0 && <p className="empty-note">{t.empty}</p>}
      </div>
    </section>
  );
}
