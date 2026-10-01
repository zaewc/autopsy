import { useEffect, useRef } from "react";
import { ArrowRight, RotateCw } from "lucide-react";
import type { ScanState } from "@/features/run-analysis";
export function ScanStatus({
  scan,
  onCancel,
  onRetry,
  onNew,
  backLabel,
}: {
  scan: Exclude<ScanState, { status: "idle" }>;
  onCancel: () => void;
  onRetry: () => void;
  onNew: () => void;
  backLabel: string;
}) {
  const failed = scan.status === "error";
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), [failed]);
  return (
    <section className="scan-status" aria-labelledby="scan-status-title">
      <div className="eyebrow">{failed ? "Analysis failed" : "Analyzing"}</div>
      <h1 id="scan-status-title" ref={heading} tabIndex={-1}>
        <span className="domain-title">{scan.target}</span>
      </h1>
      {failed ? (
        <p role="alert" className="scan-error">
          {scan.message}
        </p>
      ) : (
        <p role="status">
          Fetching the HTML document, then loading the page in a headless
          browser with scripts running. This usually takes 5 to 15 seconds and
          stops after about 40 seconds.
        </p>
      )}
      <div className="report-actions">
        {failed ? (
          <>
            <button className="secondary-button" onClick={onRetry}>
              <RotateCw size={14} />
              Retry
            </button>
            <button className="secondary-button" onClick={onNew}>
              New analysis
              <ArrowRight size={14} />
            </button>
            <button className="secondary-button" onClick={onCancel}>
              {backLabel}
            </button>
          </>
        ) : (
          <button className="secondary-button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </section>
  );
}
