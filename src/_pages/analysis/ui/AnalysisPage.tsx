import { normalizeHttpUrl } from "@/shared/lib/web-url";
import { AnalysisWorkspace } from "./AnalysisWorkspace";
export async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string | string[] }>;
}) {
  const params = await searchParams;
  const value = typeof params.site === "string" ? params.site : "";
  const domain = normalizeHttpUrl(value)?.hostname ?? "linear.app";
  return <AnalysisWorkspace initialDomain={domain} />;
}
