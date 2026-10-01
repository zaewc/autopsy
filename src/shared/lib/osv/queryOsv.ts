export interface OsvQuery {
  ecosystem: string;
  name: string;
  version: string;
}

export interface OsvVulnerability {
  id: string;
  /** Other identifiers, such as CVE numbers. */
  aliases: readonly string[];
  summary: string | null;
  /** Severity label from the source database, such as HIGH or MODERATE. */
  severity: string | null;
  /** Lowest fixed version listed for this package, when known. */
  fixed: string | null;
  url: string;
}

export interface OsvOptions {
  timeoutMs?: number;
  /** Detail lookups across all queries; further vulnerabilities keep only their id. */
  maxDetails?: number;
  fetch?: typeof fetch;
}

const API = "https://api.osv.dev/v1";

interface OsvRecord {
  id: string;
  aliases?: string[];
  summary?: string;
  database_specific?: { severity?: string };
  affected?: {
    package?: { name?: string; ecosystem?: string };
    ranges?: { events?: { fixed?: string }[] }[];
  }[];
}

function fixedVersion(record: OsvRecord, query: OsvQuery) {
  const fixes = (record.affected ?? [])
    .filter(({ package: target }) => target?.name === query.name)
    .flatMap(({ ranges }) => ranges ?? [])
    .flatMap(({ events }) => events ?? [])
    .map(({ fixed }) => fixed)
    .filter((fixed): fixed is string => Boolean(fixed));
  return (
    fixes.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))[0] ??
    null
  );
}

/**
 * Look up known vulnerabilities for exact package versions in OSV.dev. Only
 * package names and versions are sent. Returns one list per query, in order.
 */
export async function queryOsv(
  queries: readonly OsvQuery[],
  {
    timeoutMs = 6_000,
    maxDetails = 25,
    fetch: request = fetch,
  }: OsvOptions = {},
): Promise<OsvVulnerability[][]> {
  if (!queries.length) return [];
  const signal = AbortSignal.timeout(timeoutMs);
  const batch = await request(`${API}/querybatch`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      queries: queries.map(({ ecosystem, name, version }) => ({
        package: { ecosystem, name },
        version,
      })),
    }),
    signal,
  });
  if (!batch.ok) throw new Error(`OSV query failed (HTTP ${batch.status}).`);
  const { results = [] } = (await batch.json()) as {
    results?: { vulns?: { id: string }[] }[];
  };
  let budget = maxDetails;
  return Promise.all(
    queries.map((query, index) =>
      Promise.all(
        (results[index]?.vulns ?? []).map(async ({ id }) => {
          const base = {
            id,
            aliases: [] as string[],
            summary: null,
            severity: null,
            fixed: null,
            url: `https://osv.dev/vulnerability/${id}`,
          };
          if (budget <= 0) return base;
          budget -= 1;
          try {
            const response = await request(
              `${API}/vulns/${encodeURIComponent(id)}`,
              { signal },
            );
            if (!response.ok) return base;
            const record = (await response.json()) as OsvRecord;
            return {
              ...base,
              aliases: record.aliases ?? [],
              summary: record.summary ?? null,
              severity: record.database_specific?.severity ?? null,
              fixed: fixedVersion(record, query),
            };
          } catch {
            return base;
          }
        }),
      ),
    ),
  );
}
