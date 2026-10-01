"use client";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnalysisForm } from "@/features/run-analysis";
import { toSiteParam } from "@/shared/lib/web-url";
import { BrandMark } from "@/shared/ui/brand-mark";
import "./newAnalysis.css";
export function NewAnalysisPage() {
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
        <Link href="/">View a sample report ↗</Link>
      </header>
      <main>
        <div className="analysis-modal">
          <AnalysisForm onSubmit={analyze} />
        </div>
      </main>
    </div>
  );
}
