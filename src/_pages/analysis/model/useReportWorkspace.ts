"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  createSampleReport,
  type AnalysisReport,
} from "@/entities/analysis-report";
import { useWebsiteScan } from "@/features/run-analysis";
import { normalizeHttpUrl, toSiteParam } from "@/shared/lib/web-url";
import type { ReportSection } from "../config/reportSections";

function siteHref(report: AnalysisReport) {
  const url = report.mode === "live" && normalizeHttpUrl(report.url);
  return url ? `/?site=${encodeURIComponent(toSiteParam(url))}` : "/";
}

export function useReportWorkspace(initialSite: string | null) {
  const [active, setActive] = useState<ReportSection>("Overview");
  const [report, setReport] = useState<AnalysisReport>(createSampleReport);
  const [modal, setModal] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [history, setHistory] = useState<AnalysisReport[]>([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((next: AnalysisReport) => {
    setReport(next);
    setActive("Overview");
    window.history.replaceState(null, "", siteHref(next));
  }, []);
  const completeScan = useCallback(
    (next: AnalysisReport) => {
      show(next);
      setHistory((old) =>
        [next, ...old.filter((item) => item.url !== next.url)].slice(0, 5),
      );
    },
    [show],
  );
  const {
    state: scan,
    scan: startScan,
    cancel,
  } = useWebsiteScan(completeScan, initialSite);
  const analyze = useCallback(
    (url: URL) => {
      setModal(false);
      const site = toSiteParam(url);
      window.history.replaceState(
        null,
        "",
        `/?site=${encodeURIComponent(site)}`,
      );
      void startScan(site);
    },
    [startScan],
  );
  const cancelScan = useCallback(() => {
    cancel();
    window.history.replaceState(null, "", siteHref(report));
  }, [cancel, report]);
  useEffect(() => {
    if (initialSite) void startScan(initialSite);
  }, [initialSite, startScan]);
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
    anchor.download = `autopsy-${report.domain}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  return {
    active,
    setActive,
    report,
    show,
    scan,
    analyze,
    retry: startScan,
    cancelScan,
    modal,
    setModal,
    sidebar,
    setSidebar,
    history,
    copied,
    error,
    setError,
    copy,
    download,
  };
}
