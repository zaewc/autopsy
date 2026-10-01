"use client";
import { useState, type FormEvent } from "react";
import { ArrowRight, ArrowUpRight, Globe } from "lucide-react";
import { normalizeHttpUrl } from "@/shared/lib/web-url";
import "./analysisForm.css";
const EXAMPLES = ["github.com", "nextjs.org", "wordpress.org"];
export function AnalysisForm({
  onSubmit,
  titleId = "analysis-title",
}: {
  /** Receives a validated http(s) URL. */
  onSubmit: (url: URL) => void;
  titleId?: string;
}) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    const url = normalizeHttpUrl(input);
    if (!url)
      return setError("Enter a valid website URL, such as example.com.");
    setError("");
    onSubmit(url);
  }
  return (
    <div className="analysis-content">
      <div className="eyebrow">New analysis</div>
      <h2 id={titleId}>
        Put the web under
        <br />a microscope.
      </h2>
      <p>
        Enter a public website URL. autopsy fetches its HTML document once and
        reports the technologies, response headers, and basic checks it can see.
        Scripts are not executed.
      </p>
      <form onSubmit={submit} noValidate>
        <Globe size={18} />
        <input
          aria-label="Website URL"
          autoFocus
          placeholder="https://example.com"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          required
          aria-invalid={!!error}
          aria-describedby={error ? "url-error" : undefined}
        />
        <button type="submit">
          Analyze
          <ArrowRight size={16} />
        </button>
      </form>
      {error && (
        <p id="url-error" role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="try-example">
        Try
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => setInput(`https://${example}`)}
          >
            {example}
            <ArrowUpRight size={12} />
          </button>
        ))}
      </div>
    </div>
  );
}
