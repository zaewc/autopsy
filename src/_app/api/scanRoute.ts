import { NextResponse, type NextRequest } from "next/server";
import {
  scanWebsite,
  ScanError,
  type ScanFailure,
} from "@/features/run-analysis/index.server";

const STATUS: Readonly<Record<ScanFailure, number>> = {
  "invalid-url": 400,
  blocked: 400,
  "not-html": 422,
  dns: 502,
  connection: 502,
  redirects: 502,
  timeout: 504,
  aborted: 499,
};

/** GET /api/scan?url=… returns an AnalysisReport or { error: { code, message } }. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url") ?? "";
  const headers = { "cache-control": "no-store" };
  try {
    const report = await scanWebsite(url, { signal: request.signal });
    return NextResponse.json(report, { headers });
  } catch (error) {
    if (!(error instanceof ScanError)) throw error;
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: STATUS[error.code], headers },
    );
  }
}
