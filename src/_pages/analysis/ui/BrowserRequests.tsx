"use client";
import { useState } from "react";
import type { BrowserObservation } from "@/entities/analysis-report";
import { useMessages, type Localized } from "@/shared/lib/i18n";
import { SectionHeading } from "@/shared/ui/section-heading";
import {
  formatCount,
  formatKilobytes,
  formatMs,
  resourceLabel,
} from "../lib/formatMetrics";

const INITIAL_ROWS = 40;
const COLUMNS = ["type", "status", "size", "start", "time"] as const;
const MESSAGES: Localized<{
  title: string;
  summary: (
    requests: string,
    more: boolean,
    failed: number,
    errors: number,
  ) => string;
  refused: string;
  refusedDetail: (hosts: string) => string;
  columns: Readonly<Record<(typeof COLUMNS)[number], string>>;
  showAll: (count: string) => string;
}> = {
  en: {
    title: "Browser requests",
    summary: (requests, more, failed, errors) =>
      `${requests}${more ? "+" : ""} requests · ${failed} failed · ${errors} console error${errors === 1 ? "" : "s"}`,
    refused: "Refused by the scanner.",
    refusedDetail: (hosts) =>
      `The page tried to reach ${hosts}. These destinations are private, reserved, or on ports other than 80 and 443, so they were not contacted.`,
    columns: {
      type: "Type",
      status: "Status",
      size: "Size",
      start: "Start",
      time: "Time",
    },
    showAll: (count) => `Show all ${count} requests`,
  },
  ko: {
    title: "브라우저 요청",
    summary: (requests, more, failed, errors) =>
      `요청 ${requests}${more ? "+" : ""}개 · 실패 ${failed}개 · console 오류 ${errors}개`,
    refused: "스캐너가 차단했습니다.",
    refusedDetail: (hosts) =>
      `페이지가 ${hosts}에 접근하려 했습니다. 이 대상은 비공개 또는 예약 주소이거나 80, 443 이외의 포트를 사용하므로 연결하지 않았습니다.`,
    columns: {
      type: "유형",
      status: "상태",
      size: "크기",
      start: "시작",
      time: "시간",
    },
    showAll: (count) => `요청 ${count}개 모두 보기`,
  },
};

/** Every request the scanner's browser made, including refused ones. */
export function BrowserRequests({ browser }: { browser: BrowserObservation }) {
  const t = useMessages(MESSAGES);
  const [all, setAll] = useState(false);
  const rows = all ? browser.requests : browser.requests.slice(0, INITIAL_ROWS);
  const failed = browser.requests.filter(({ failure }) => failure).length;
  return (
    <section>
      <SectionHeading title={t.title}>
        <span className="muted-caption">
          {t.summary(
            formatCount(browser.requests.length),
            browser.requestsTruncated,
            failed,
            browser.consoleErrors,
          )}
        </span>
      </SectionHeading>
      {browser.blocked.length > 0 && (
        <p className="report-note">
          <strong>{t.refused}</strong>{" "}
          {t.refusedDetail(browser.blocked.join(", "))}
        </p>
      )}
      <table className="header-table request-table">
        <thead>
          <tr>
            <th scope="col">URL</th>
            {COLUMNS.map((column) => (
              <th scope="col" key={column}>
                {t.columns[column]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((request, index) => (
            <tr key={`${index}-${request.url}`}>
              <th scope="row">{request.url}</th>
              <td data-label={t.columns.type}>{resourceLabel(request.type)}</td>
              <td
                data-label={t.columns.status}
                title={request.failure ?? undefined}
                className={
                  request.failure || (request.status ?? 0) >= 400
                    ? "amber"
                    : undefined
                }
              >
                {request.status ?? request.failure}
              </td>
              <td data-label={t.columns.size}>
                {formatKilobytes(request.bytes)}
              </td>
              <td data-label={t.columns.start}>{formatMs(request.startMs)}</td>
              <td data-label={t.columns.time}>
                {request.durationMs === null
                  ? "—"
                  : formatMs(request.durationMs)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!all && browser.requests.length > INITIAL_ROWS && (
        <button
          className="secondary-button show-all"
          onClick={() => setAll(true)}
        >
          {t.showAll(formatCount(browser.requests.length))}
        </button>
      )}
    </section>
  );
}
