import type { BrowserObservation } from "@/entities/analysis-report";
import { useMessages } from "@/shared/lib/i18n";
import { SectionHeading } from "@/shared/ui/section-heading";
import { VITAL_RATING_LABELS } from "../config/labels";
import {
  formatKilobytes,
  formatMs,
  resourceLabel,
  shortUrl,
} from "../lib/formatMetrics";
import {
  LAB_VITALS as VITALS,
  displayVital as display,
  rateVital as rating,
} from "../lib/vitals";
import { Waterfall } from "./Waterfall";

const WATERFALL_ROWS = 12;
const CATEGORY_NAMES: Readonly<Record<string, string>> = {
  JS: "JavaScript",
  IMG: "Images",
  FONT: "Fonts",
  CSS: "CSS",
  HTML: "HTML",
  XHR: "Data requests",
  OTHER: "Other",
};

/** Lab measurements from loading the page in the scanner's browser. */
export function BrowserPerformance({
  browser,
}: {
  browser: BrowserObservation;
}) {
  const ratings = useMessages(VITAL_RATING_LABELS);
  const loaded = browser.requests.filter(
    (request) => request.status !== null && request.durationMs !== null,
  );
  const shown = loaded.slice(0, WATERFALL_ROWS).map((request) => ({
    name: shortUrl(request.url),
    title: request.url,
    type: resourceLabel(request.type),
    start: request.startMs,
    duration: request.durationMs ?? 0,
  }));
  const timeline = Math.max(
    100,
    ...shown.map(({ start, duration }) => start + duration),
  );
  const totals = new Map<string, number>();
  for (const request of loaded) {
    const label = resourceLabel(request.type);
    totals.set(label, (totals.get(label) ?? 0) + request.bytes);
  }
  const total = [...totals.values()].reduce((sum, bytes) => sum + bytes, 0);
  const categories = [...totals]
    .filter(([, bytes]) => bytes > 0)
    .sort(([, a], [, b]) => b - a);
  return (
    <section>
      <SectionHeading title="Performance">
        <span className="muted-caption">
          Lab values · headless Chromium, desktop, no throttling
        </span>
      </SectionHeading>
      <div className="vitals">
        {VITALS.map(({ key, name, short, limits }) => {
          const value = browser.vitals[key];
          const shownValue = value === null ? null : display(key, value);
          const result = value === null ? null : rating(value, limits);
          return (
            <div className="vital" key={short}>
              <div className="vital-label">
                {name}
                <span>{short}</span>
              </div>
              <div className="vital-value">
                {shownValue ? shownValue.value : "—"}
                <span>{shownValue?.unit}</span>
              </div>
              <div className="vital-footer">
                <span className={result?.tone === "warn" ? "amber" : undefined}>
                  {result ? (
                    <>
                      <i />
                      {ratings[result.rating]}
                    </>
                  ) : (
                    "Not reported"
                  )}
                </span>
                <span>≤ {key === "cls" ? limits[0] : formatMs(limits[0])}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="performance-details">
        <div className="requests-panel">
          <div className="subheading">
            Request waterfall
            <span>
              First {shown.length} of {browser.requests.length}
              {browser.requestsTruncated ? "+" : ""} requests
            </span>
          </div>
          <Waterfall requests={shown} timelineMs={timeline} measured />
        </div>
        <div className="resource-panel">
          <div className="subheading">
            Response bodies<span>{formatKilobytes(total)}</span>
          </div>
          <div
            className="resource-stack measured"
            role="img"
            aria-label={categories
              .map(
                ([label, bytes]) =>
                  `${CATEGORY_NAMES[label]} ${Math.round((bytes / total) * 100)}%`,
              )
              .join(", ")}
          >
            {categories.map(([label, bytes]) => (
              <i
                key={label}
                className={`bar-${label}`}
                style={{ width: `${(bytes / total) * 100}%` }}
              />
            ))}
          </div>
          {categories.map(([label, bytes]) => (
            <div className="resource-row" key={label}>
              <i className={`resource-color bar-${label}`} />
              <span>{CATEGORY_NAMES[label]}</span>
              <strong>{formatKilobytes(bytes)}</strong>
              <small>{Math.round((bytes / total) * 100)}%</small>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
