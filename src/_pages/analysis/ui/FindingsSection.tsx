"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { SAMPLE_FINDINGS as findings } from "@/entities/analysis-report";
import { SectionHeading } from "@/shared/ui/section-heading";
export function FindingsSection() {
  const [filter, setFilter] = useState("All");
  const [expanded, setExpanded] = useState<number | null>(null);
  return (
    <section className="findings-section">
      <SectionHeading number="04" title="Worth a closer look">
        <div className="filter-buttons">
          {["All", "Warning", "Info"].map((f) => (
            <button
              key={f}
              className={filter === f ? "active" : ""}
              onClick={() => setFilter(f)}
            >
              {f}
              {f === "All" ? " 3" : ""}
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
                    {f.severity === "warning" ? "!" : "i"}
                  </span>
                  <span className="finding-title">{f.title}</span>
                  <span className="finding-tag">{f.tag}</span>
                  <ChevronDown
                    size={15}
                    className={expanded === i ? "rotated" : ""}
                  />
                </button>
                {expanded === i && (
                  <div className="finding-content">
                    <div>
                      <h3>Evidence</h3>
                      <p>{f.detail}</p>
                    </div>
                    <div>
                      <h3>Why it matters</h3>
                      <p>{f.why}</p>
                    </div>
                    <div>
                      <h3>Suggested improvement</h3>
                      <p>{f.fix}</p>
                    </div>
                  </div>
                )}
              </div>
            ),
        )}
      </div>
    </section>
  );
}
