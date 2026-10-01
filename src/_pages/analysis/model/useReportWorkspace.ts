"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createSampleReport,
  type AnalysisReport,
} from "@/entities/analysis-report";
import type { ReportSection } from "../config/reportSections";
export function useReportWorkspace(initialDomain: string) {
  const [active, setActive] = useState<ReportSection>("Overview");
  const [domain, setDomain] = useState(initialDomain);
  const [modal, setModal] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [history, setHistory] = useState(() =>
    Array.from(new Set([initialDomain, "vercel.com", "github.com"])),
  );
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const report = useMemo(() => createSampleReport(domain), [domain]);
  useEffect(() => {
    function key(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setModal(true);
        setSidebar(false);
      }
    }
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);
  useEffect(() => {
    const viewport = window.matchMedia("(max-width: 800px)");
    function closeDesktopNavigation() {
      if (!viewport.matches) setSidebar(false);
    }
    viewport.addEventListener("change", closeDesktopNavigation);
    return () => viewport.removeEventListener("change", closeDesktopNavigation);
  }, []);
  const completeScan = useCallback((next: AnalysisReport) => {
    setDomain(next.domain);
    setHistory((old) =>
      [next.domain, ...old.filter((item) => item !== next.domain)].slice(0, 5),
    );
    setActive("Overview");
    setModal(false);
  }, []);
  async function copy() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Clipboard access is unavailable. Use Export report instead.");
    }
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `autopsy-${domain}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  return {
    active,
    setActive,
    domain,
    setDomain,
    report,
    modal,
    setModal,
    sidebar,
    setSidebar,
    history,
    copied,
    error,
    setError,
    completeScan,
    copy,
    download,
  };
}
