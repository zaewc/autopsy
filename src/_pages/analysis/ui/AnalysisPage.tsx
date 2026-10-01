import { AnalysisWorkspace } from "./AnalysisWorkspace";
export async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string | string[] }>;
}) {
  const params = await searchParams;
  const site = typeof params.site === "string" ? params.site.trim() : "";
  return <AnalysisWorkspace initialSite={site || null} />;
}
