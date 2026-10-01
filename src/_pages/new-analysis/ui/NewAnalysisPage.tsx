"use client";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnalysisForm } from "@/features/run-analysis";
import type { AnalysisReport } from "@/entities/analysis-report";
import { BrandMark } from "@/shared/ui/brand-mark";
import "./newAnalysis.css";
export function NewAnalysisPage() {
  const router = useRouter();
  const complete = useCallback(
    (report: AnalysisReport) =>
      router.push(`/?site=${encodeURIComponent(report.domain)}`),
    [router],
  );
  return (
    <div className="landing">
      <header>
        <Link className="brand" href="/new">
          <BrandMark />
          autopsy<span className="beta">BETA</span>
        </Link>
        <Link href="/">Explore a sample report ↗</Link>
      </header>
      <main>
        <div className="analysis-modal">
          <AnalysisForm onComplete={complete} />
        </div>
        <p className="landing-note">
          PUBLIC SIGNALS. CLEAR EVIDENCE. NO BLACK BOXES.
        </p>
      </main>
    </div>
  );
}
