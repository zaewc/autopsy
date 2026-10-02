import { useEffect, useRef } from "react";
import { ArrowRight, RotateCw } from "lucide-react";
import type { ScanState } from "@/features/run-analysis";
import { useMessages, type Localized } from "@/shared/lib/i18n";
const MESSAGES: Localized<{
  failed: string;
  analyzing: string;
  progress: string;
  retry: string;
  newAnalysis: string;
  cancel: string;
}> = {
  en: {
    failed: "Analysis failed",
    analyzing: "Analyzing",
    progress:
      "Fetching the HTML document, then loading the page in a headless browser with scripts running. This usually takes 5 to 15 seconds and stops after about 40 seconds.",
    retry: "Retry",
    newAnalysis: "New analysis",
    cancel: "Cancel",
  },
  ko: {
    failed: "분석 실패",
    analyzing: "분석 중",
    progress:
      "HTML 문서를 가져온 뒤 headless 브라우저에서 스크립트를 실행한 상태로 페이지를 불러옵니다. 보통 5~15초가 걸리며 약 40초가 지나면 중단됩니다.",
    retry: "다시 시도",
    newAnalysis: "새 분석",
    cancel: "취소",
  },
};
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
  const t = useMessages(MESSAGES);
  const failed = scan.status === "error";
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), [failed]);
  return (
    <section className="scan-status" aria-labelledby="scan-status-title">
      <div className="eyebrow">{failed ? t.failed : t.analyzing}</div>
      <h1 id="scan-status-title" ref={heading} tabIndex={-1}>
        <span className="domain-title">{scan.target}</span>
      </h1>
      {failed ? (
        <p role="alert" className="scan-error">
          {scan.message}
        </p>
      ) : (
        <p role="status">{t.progress}</p>
      )}
      <div className="report-actions">
        {failed ? (
          <>
            <button className="secondary-button" onClick={onRetry}>
              <RotateCw size={14} />
              {t.retry}
            </button>
            <button className="secondary-button" onClick={onNew}>
              {t.newAnalysis}
              <ArrowRight size={14} />
            </button>
            <button className="secondary-button" onClick={onCancel}>
              {backLabel}
            </button>
          </>
        ) : (
          <button className="secondary-button" onClick={onCancel}>
            {t.cancel}
          </button>
        )}
      </div>
    </section>
  );
}
