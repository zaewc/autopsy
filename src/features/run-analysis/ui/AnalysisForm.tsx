"use client";
import {
  ArrowRight,
  ArrowUpRight,
  Globe,
  Check,
  Terminal,
  ShieldCheck,
} from "lucide-react";
import {
  ArchitectureDiagram,
  type AnalysisReport,
} from "@/entities/analysis-report";
import { BrandMark } from "@/shared/ui/brand-mark";
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
      <BrandMark />
      <div className="eyebrow">THE WEB, DISSECTED.</div>
      <h2 id={titleId}>
        Put the web under
        <br />a microscope.
      </h2>
      <p>
        Explore the technology, performance, and architecture
        <br className="desktop-br" /> behind any public website.
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
          {stage >= 0 ? "Scanning" : "Analyze"}
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
            <i style={{ width: `${(stage + 1) * 20}%` }} />
          </div>
          <p>
            <Terminal size={13} />
            {SCAN_MESSAGES[stage]}
          </p>
        </div>
      )}
      <ArchitectureDiagram />
      <div className="modal-foot">
        <ShieldCheck size={13} />
        Interactive demo · generates sample reports, not live scans
      </div>
    </div>
  );
}
