"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AnalysisReport } from "@/entities/analysis-report";
import { useMessages, type Localized } from "@/shared/lib/i18n";

const MESSAGES: Localized<{
  failed: (status: number) => string;
  unreachable: string;
}> = {
  en: {
    failed: (status) => `Scan failed (HTTP ${status}).`,
    unreachable: "The scan service could not be reached. Try again.",
  },
  ko: {
    failed: (status) => `스캔에 실패했습니다 (HTTP ${status}).`,
    unreachable: "스캔 서비스에 연결할 수 없습니다. 다시 시도하세요.",
  },
};

export type ScanState =
  | { status: "idle" }
  | { status: "scanning"; target: string }
  | { status: "error"; target: string; message: string };

/**
 * Request a live scan from /api/scan; cancelling aborts the server fetch too.
 * An initial target starts in the scanning state so no other report flashes
 * before the request begins.
 */
export function useWebsiteScan(
  onComplete: (report: AnalysisReport) => void,
  initialTarget: string | null = null,
) {
  // Read through a ref so a language change does not restart the initial scan.
  const t = useMessages(MESSAGES);
  const messages = useRef(t);
  useEffect(() => {
    messages.current = t;
  }, [t]);
  const [state, setState] = useState<ScanState>(() =>
    initialTarget
      ? { status: "scanning", target: initialTarget }
      : { status: "idle" },
  );
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const scan = useCallback(
    async (target: string) => {
      controller.current?.abort();
      const current = new AbortController();
      controller.current = current;
      setState({ status: "scanning", target });
      try {
        const response = await fetch(
          `/api/scan?url=${encodeURIComponent(target)}`,
          { signal: current.signal },
        );
        const body = await response.json();
        if (current.signal.aborted) return;
        if (!response.ok)
          return setState({
            status: "error",
            target,
            message:
              body?.error?.message ?? messages.current.failed(response.status),
          });
        setState({ status: "idle" });
        onComplete(body as AnalysisReport);
      } catch {
        if (current.signal.aborted) return;
        setState({
          status: "error",
          target,
          message: messages.current.unreachable,
        });
      }
    },
    [onComplete],
  );
  const cancel = useCallback(() => {
    controller.current?.abort();
    setState({ status: "idle" });
  }, []);
  return { state, scan, cancel };
}
