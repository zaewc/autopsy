"use client";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnalysisForm } from "@/features/run-analysis";
import { useMessages, type Localized } from "@/shared/lib/i18n";
import { toSiteParam } from "@/shared/lib/web-url";
import { BrandMark } from "@/shared/ui/brand-mark";
import "./newAnalysis.css";
const MESSAGES: Localized<{ sample: string }> = {
  en: { sample: "View a sample report ↗" },
  ko: { sample: "샘플 리포트 보기 ↗" },
};
export function NewAnalysisPage() {
  const t = useMessages(MESSAGES);
  const router = useRouter();
  const analyze = useCallback(
    (url: URL) => router.push(`/?site=${encodeURIComponent(toSiteParam(url))}`),
    [router],
  );
  return (
    <div className="landing">
      <header>
        <Link className="brand" href="/new">
          <BrandMark />
          autopsy
        </Link>
        <Link href="/">{t.sample}</Link>
      </header>
      <main>
        <div className="analysis-modal">
          <AnalysisForm onSubmit={analyze} />
        </div>
      </main>
    </div>
  );
}
