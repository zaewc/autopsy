import type { ScannedDocument } from "@/entities/analysis-report";
import { SectionHeading } from "@/shared/ui/section-heading";
import { LongValue } from "./LongValue";
import "./documentResponse.css";

const number = new Intl.NumberFormat("en");
const kilobytes = (bytes: number) =>
  `${new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(bytes / 1000)} kB`;

function ResponseSummary({
  document,
  browserMeasured,
}: {
  document: ScannedDocument;
  browserMeasured: boolean;
}) {
  const metrics = [
    ["HTTP status", String(document.status)],
    ["Response time", `${number.format(document.responseMs)} ms`],
    [
      "HTML inspected",
      `${kilobytes(document.bytes)}${document.truncated ? " (truncated)" : ""}`,
    ],
    ["Redirects", String(document.redirects.length)],
    ["Script files", String(document.resources.scripts)],
    ["Stylesheets", String(document.resources.stylesheets)],
    ["Images", String(document.resources.images)],
  ];
  return (
    <>
      <dl className="document-metrics">
        {metrics.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="empty-note">
        Response time runs until the response headers arrived at the autopsy
        server, not in a visitor&apos;s browser. Resource counts are elements
        referenced by the HTML document.
        {browserMeasured
          ? " Browser timings above come from a separate page load."
          : " Core Web Vitals and a request waterfall need a browser run and were not measured."}
      </p>
    </>
  );
}

function ResponseHeaders({
  url,
  document,
}: {
  url: string;
  document: ScannedDocument;
}) {
  const headers = Object.entries(document.headers).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  return (
    <>
      <div className="subheading">
        Redirect chain
        <span>
          {document.redirects.length
            ? `${document.redirects.length} redirect${document.redirects.length === 1 ? "" : "s"}`
            : "No redirects"}
        </span>
      </div>
      <ol className="redirect-chain">
        {[...document.redirects, url].map((hop, index, hops) => (
          <li key={`${index}-${hop}`}>
            <code>{hop}</code>
            <span>
              {index === hops.length - 1
                ? `HTTP ${document.status} · final`
                : "redirect"}
            </span>
          </li>
        ))}
      </ol>
      <div className="subheading">
        Response headers<span>{headers.length} headers</span>
      </div>
      <table className="header-table">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          {headers.map(([name, value]) => (
            <tr key={name}>
              <th scope="row">{name}</th>
              <td>
                <LongValue value={value} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

/** What the scanner observed about the single HTTP response it fetched. */
export function DocumentResponse({
  url,
  document,
  network,
  browserMeasured,
}: {
  url: string;
  document: ScannedDocument;
  network: boolean;
  /** A browser stage measured this page, so its metrics appear elsewhere. */
  browserMeasured: boolean;
}) {
  return (
    <section>
      <SectionHeading
        title={network ? "Network response" : "Document response"}
      >
        <span className="muted-caption">One HTML request from the server</span>
      </SectionHeading>
      {network ? (
        <ResponseHeaders url={url} document={document} />
      ) : (
        <ResponseSummary
          document={document}
          browserMeasured={browserMeasured}
        />
      )}
    </section>
  );
}
