"use client";
import { useState } from "react";
import type { BrowserObservation } from "@/entities/analysis-report";
import { SectionHeading } from "@/shared/ui/section-heading";
import {
  formatCount,
  formatKilobytes,
  formatMs,
  resourceLabel,
} from "../lib/formatMetrics";

const INITIAL_ROWS = 40;

/** Every request the scanner's browser made, including refused ones. */
export function BrowserRequests({ browser }: { browser: BrowserObservation }) {
  const [all, setAll] = useState(false);
  const rows = all ? browser.requests : browser.requests.slice(0, INITIAL_ROWS);
  const failed = browser.requests.filter(({ failure }) => failure).length;
  return (
    <section>
      <SectionHeading title="Browser requests">
        <span className="muted-caption">
          {formatCount(browser.requests.length)}
          {browser.requestsTruncated ? "+" : ""} requests · {failed} failed ·{" "}
          {browser.consoleErrors} console error
          {browser.consoleErrors === 1 ? "" : "s"}
        </span>
      </SectionHeading>
      {browser.blocked.length > 0 && (
        <p className="report-note">
          <strong>Refused by the scanner.</strong> The page tried to reach{" "}
          {browser.blocked.join(", ")}. These destinations are private,
          reserved, or on ports other than 80 and 443, so they were not
          contacted.
        </p>
      )}
      <table className="header-table request-table">
        <thead>
          <tr>
            <th scope="col">URL</th>
            <th scope="col">Type</th>
            <th scope="col">Status</th>
            <th scope="col">Size</th>
            <th scope="col">Start</th>
            <th scope="col">Time</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((request, index) => (
            <tr key={`${index}-${request.url}`}>
              <th scope="row">{request.url}</th>
              <td data-label="Type">{resourceLabel(request.type)}</td>
              <td
                data-label="Status"
                title={request.failure ?? undefined}
                className={
                  request.failure || (request.status ?? 0) >= 400
                    ? "amber"
                    : undefined
                }
              >
                {request.status ?? request.failure}
              </td>
              <td data-label="Size">{formatKilobytes(request.bytes)}</td>
              <td data-label="Start">{formatMs(request.startMs)}</td>
              <td data-label="Time">
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
          Show all {formatCount(browser.requests.length)} requests
        </button>
      )}
    </section>
  );
}
