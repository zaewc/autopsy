"use client";
import { useEffect, useState, type FormEvent } from "react";
import {
  createSampleReport,
  type AnalysisReport,
} from "@/entities/analysis-report";
import { normalizeHttpUrl } from "@/shared/lib/web-url";
export const SCAN_STAGES = [
  "DISCOVERING",
  "IDENTIFYING",
  "PROFILING",
  "ANALYZING",
  "COMPLETE",
] as const;
export const SCAN_MESSAGES = [
  "Resolving public surface…",
  "Matching technology fingerprints…",
  "Profiling resource timings…",
  "Correlating diagnostic evidence…",
  "Sample report ready.",
] as const;
export function useSampleScan(onComplete: (report: AnalysisReport) => void) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [stage, setStage] = useState(-1);
  const [domain, setDomain] = useState("");
  useEffect(() => {
    if (stage < 0) return;
    const timer = setTimeout(
      () => {
        if (stage === SCAN_STAGES.length - 1)
          onComplete(createSampleReport(domain));
        else setStage((current) => current + 1);
      },
      stage === SCAN_STAGES.length - 1 ? 700 : 850,
    );
    return () => clearTimeout(timer);
  }, [stage, domain, onComplete]);
  function analyze(event: FormEvent) {
    event.preventDefault();
    const url = normalizeHttpUrl(input);
    if (!url) {
      setError("Enter a valid website URL, such as example.com.");
      return;
    }
    setError("");
    setDomain(url.hostname);
    setStage(0);
  }
  return { input, setInput, error, stage, analyze };
}
