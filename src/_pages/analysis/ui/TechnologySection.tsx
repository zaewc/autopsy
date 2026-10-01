"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Technology } from "@/entities/analysis-report";
import { SectionHeading } from "@/shared/ui/section-heading";
export function TechnologySection({
  technologies,
}: {
  technologies: readonly Technology[];
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <section>
      <SectionHeading title="Technology stack">
        <span className="muted-caption">
          {technologies.length} examples · select to inspect
        </span>
      </SectionHeading>
      <div className="technology-list">
        <div className="technology-columns" aria-hidden="true">
          <span>Technology</span>
          <span>Role</span>
          <span>Example signal</span>
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
                {technology.name}
                <small>{technology.version}</small>
              </span>
              <span className="technology-role">
                {technology.type.replace(" · inferred", "")}
              </span>
              <span className="technology-basis">
                {technology.basis}
                <ChevronDown
                  size={14}
                  className={expanded === technology.name ? "rotated" : ""}
                />
              </span>
            </button>
            {expanded === technology.name && (
              <div id={`evidence-${technology.name}`} className="evidence">
                <strong>{technology.name} · sample evidence</strong>
                <p>{technology.evidence}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
