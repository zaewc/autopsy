import type { ScannedDocument } from "@/entities/analysis-report";
import { useMessages, type Localized } from "@/shared/lib/i18n";
import { SectionHeading } from "@/shared/ui/section-heading";
import { LongValue } from "./LongValue";
import "./documentResponse.css";

const number = new Intl.NumberFormat("en");
const kilobytes = (bytes: number) =>
  `${new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(bytes / 1000)} kB`;

const MESSAGES: Localized<{
  status: string;
  responseTime: string;
  inspected: string;
  truncated: string;
  redirects: string;
  scripts: string;
  stylesheets: string;
  images: string;
  note: string;
  browserMeasured: string;
  browserMissing: string;
  chain: string;
  redirectCount: (count: number) => string;
  noRedirects: string;
  final: (status: number) => string;
  redirect: string;
  headers: string;
  headerCount: (count: number) => string;
  name: string;
  value: string;
  network: string;
  document: string;
  caption: string;
}> = {
  en: {
    status: "HTTP status",
    responseTime: "Response time",
    inspected: "HTML inspected",
    truncated: " (truncated)",
    redirects: "Redirects",
    scripts: "Script files",
    stylesheets: "Stylesheets",
    images: "Images",
    note: "Response time runs until the response headers arrived at the autopsy server, not in a visitor's browser. Resource counts are elements referenced by the HTML document.",
    browserMeasured: " Browser timings above come from a separate page load.",
    browserMissing:
      " Core Web Vitals and a request waterfall need a browser run and were not measured.",
    chain: "Redirect chain",
    redirectCount: (count) => `${count} redirect${count === 1 ? "" : "s"}`,
    noRedirects: "No redirects",
    final: (status) => `HTTP ${status} · final`,
    redirect: "redirect",
    headers: "Response headers",
    headerCount: (count) => `${count} headers`,
    name: "Name",
    value: "Value",
    network: "Network response",
    document: "Document response",
    caption: "One HTML request from the server",
  },
  ko: {
    status: "HTTP 상태",
    responseTime: "응답 시간",
    inspected: "검사한 HTML",
    truncated: " (잘림)",
    redirects: "리디렉션",
    scripts: "스크립트 파일",
    stylesheets: "스타일시트",
    images: "이미지",
    note: "응답 시간은 방문자의 브라우저가 아니라 autopsy 서버에 응답 헤더가 도착할 때까지 잰 값입니다. 리소스 수는 HTML 문서가 참조하는 요소의 수입니다.",
    browserMeasured:
      " 위의 브라우저 타이밍은 별도의 페이지 로드에서 측정했습니다.",
    browserMissing:
      " Core Web Vitals와 요청 waterfall은 브라우저 실행이 필요해 측정하지 않았습니다.",
    chain: "리디렉션 체인",
    redirectCount: (count) => `리디렉션 ${count}개`,
    noRedirects: "리디렉션 없음",
    final: (status) => `HTTP ${status} · 최종`,
    redirect: "리디렉션",
    headers: "응답 헤더",
    headerCount: (count) => `헤더 ${count}개`,
    name: "이름",
    value: "값",
    network: "네트워크 응답",
    document: "문서 응답",
    caption: "서버에서 보낸 HTML 요청 1건",
  },
};

function ResponseSummary({
  document,
  browserMeasured,
}: {
  document: ScannedDocument;
  browserMeasured: boolean;
}) {
  const t = useMessages(MESSAGES);
  const metrics = [
    [t.status, String(document.status)],
    [t.responseTime, `${number.format(document.responseMs)} ms`],
    [
      t.inspected,
      `${kilobytes(document.bytes)}${document.truncated ? t.truncated : ""}`,
    ],
    [t.redirects, String(document.redirects.length)],
    [t.scripts, String(document.resources.scripts)],
    [t.stylesheets, String(document.resources.stylesheets)],
    [t.images, String(document.resources.images)],
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
        {t.note}
        {browserMeasured ? t.browserMeasured : t.browserMissing}
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
  const t = useMessages(MESSAGES);
  const headers = Object.entries(document.headers).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  return (
    <>
      <div className="subheading">
        {t.chain}
        <span>
          {document.redirects.length
            ? t.redirectCount(document.redirects.length)
            : t.noRedirects}
        </span>
      </div>
      <ol className="redirect-chain">
        {[...document.redirects, url].map((hop, index, hops) => (
          <li key={`${index}-${hop}`}>
            <code>{hop}</code>
            <span>
              {index === hops.length - 1
                ? t.final(document.status)
                : t.redirect}
            </span>
          </li>
        ))}
      </ol>
      <div className="subheading">
        {t.headers}
        <span>{t.headerCount(headers.length)}</span>
      </div>
      <table className="header-table">
        <thead>
          <tr>
            <th scope="col">{t.name}</th>
            <th scope="col">{t.value}</th>
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
  const t = useMessages(MESSAGES);
  return (
    <section>
      <SectionHeading title={network ? t.network : t.document}>
        <span className="muted-caption">{t.caption}</span>
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
