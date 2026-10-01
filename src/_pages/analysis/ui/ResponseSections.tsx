import type { AnalysisReport } from "@/entities/analysis-report";
import { BrowserPerformance } from "./BrowserPerformance";
import { BrowserRequests } from "./BrowserRequests";
import { DocumentResponse } from "./DocumentResponse";
import { PerformanceSection } from "./PerformanceSection";

/** Performance and network views: sample, HTML response, and browser data. */
export function ResponseSections({
  report,
  view,
}: {
  report: AnalysisReport;
  view: "performance" | "network";
}) {
  const { document, browser } = report;
  if (!document) return <PerformanceSection network={view === "network"} />;
  const response = (
    <DocumentResponse
      url={report.url}
      document={document}
      network={view === "network"}
      browserMeasured={browser !== null}
    />
  );
  if (!browser) return response;
  return (
    <>
      {view === "network" ? (
        <BrowserRequests browser={browser} />
      ) : (
        <BrowserPerformance browser={browser} />
      )}
      {response}
    </>
  );
}
