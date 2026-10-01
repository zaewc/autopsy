"use client";
import { ArrowRight, ArrowUpRight, Globe, Check } from "lucide-react";
import {
  ArchitectureDiagram,
  type AnalysisReport,
} from "@/entities/analysis-report";
import {
  useSampleScan,
  SCAN_STAGES,
  SCAN_MESSAGES,
} from "../model/useSampleScan";
import "./analysisForm.css";
export function AnalysisForm({
  onComplete,
  titleId = "analysis-title",
}: {
  onComplete: (report: AnalysisReport) => void;
  titleId?: string;
}) {
  const { input, setInput, error, stage, analyze } = useSampleScan(onComplete);
  return (
    <div className="analysis-content">
      <div className="eyebrow">Explore a sample report</div>
      <h2 id={titleId}>
        Put the web under
        <br />a microscope.
      </h2>
      <p>
        Enter a website URL to explore an example of its technical report. All
        URLs use the same sample data; this demo does not scan websites.
      </p>
      <form onSubmit={analyze}>
        <Globe size={18} />
        <input
          aria-label="Website URL"
          autoFocus
          placeholder="https://example.com"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={stage >= 0}
          required
          aria-invalid={!!error}
          aria-describedby={error ? "url-error" : undefined}
        />
        <button disabled={stage >= 0} type="submit">
          {stage >= 0 ? "Preparing…" : "Open sample"}
          <ArrowRight size={16} />
        </button>
      </form>
      {error && (
        <p id="url-error" role="alert" className="form-error">
          {error}
        </p>
      )}
      {stage < 0 ? (
        <div className="try-example">
          Try an example
          <button onClick={() => setInput("https://linear.app")}>
            linear.app
            <ArrowUpRight size={12} />
          </button>
          <button onClick={() => setInput("https://vercel.com")}>
            vercel.com
            <ArrowUpRight size={12} />
          </button>
        </div>
      ) : (
        <div className="scan-progress" role="status" aria-live="polite">
          {SCAN_STAGES.map((name, index) => (
            <div className={index <= stage ? "done" : ""} key={name}>
              <span>
                {index < stage ? (
                  <Check size={12} />
                ) : (
                  String(index + 1).padStart(2, "0")
                )}
              </span>
              {name}
            </div>
          ))}
          <div className="scan-track">
            <i
              style={{
                transform: `scaleX(${(stage + 1) / SCAN_STAGES.length})`,
              }}
            />
          </div>
          <p>{SCAN_MESSAGES[stage]}</p>
        </div>
      )}
      <ArchitectureDiagram />
      <div className="modal-foot">
        Example architecture · select a node to inspect its evidence
      </div>
    </div>
  );
}
