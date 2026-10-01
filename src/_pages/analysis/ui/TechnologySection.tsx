"use client";
import { useState } from "react";
import { SAMPLE_TECHNOLOGIES as tech } from "@/entities/analysis-report";
import { SectionHeading } from "@/shared/ui/section-heading";
export function TechnologySection() {
  const [expanded, setExpanded] = useState<number | null>(null);
  return (
    <section>
      <SectionHeading number="01" title="Technology stack">
        <span className="muted-caption">
          6 technologies detected <span className="tiny-dot">·</span> Sample
          evidence
        </span>
      </SectionHeading>
      <div className="tech-grid">
        {tech.map((t) => (
          <button
            className="tech-card"
            key={t.name}
            onClick={() => {
              setExpanded(tech.indexOf(t) + 10);
            }}
          >
            <span className={`tech-logo logo-${t.name}`}>{t.logo}</span>
            <div>
              <strong>
                {t.name}
                <small>{t.version}</small>
              </strong>
              <span>{t.type}</span>
            </div>
            <span className="confidence">
              <i />
              {t.confidence}%
            </span>
          </button>
        ))}
      </div>
      {expanded !== null && expanded >= 10 && (
        <div className="evidence">
          <strong>
            {tech[expanded - 10].name} · sample detection evidence
          </strong>
          <p>
            {
              [
                "Detected from /_next/static resource paths and framework bootstrap data.",
                "Detected from React runtime markers in the sample JavaScript bundle.",
                "Inferred from source map naming conventions. This does not prove the original source language.",
                "Detected from the x-vercel-id response header.",
                "Detected from the cf-ray response header.",
                "Detected from a third-party request to a Sentry ingestion endpoint.",
              ][expanded - 10]
            }
          </p>
        </div>
      )}
    </section>
  );
}
