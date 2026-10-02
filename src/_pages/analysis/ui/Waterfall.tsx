import { useMessages, type Localized } from "@/shared/lib/i18n";
import { formatCount } from "../lib/formatMetrics";
const MESSAGES: Localized<{
  resource: string;
  timing: (
    name: string,
    start: number,
    duration: number,
    measured: boolean,
  ) => string;
}> = {
  en: {
    resource: "Resource",
    timing: (name, start, duration, measured) =>
      `${name}: starts at ${start} ms, duration ${duration} ms (${measured ? "measured" : "simulated"})`,
  },
  ko: {
    resource: "리소스",
    timing: (name, start, duration, measured) =>
      `${name}: ${start} ms에 시작, ${duration} ms 소요 (${measured ? "측정값" : "예시"})`,
  },
};
export interface WaterfallRequest {
  name: string;
  /** Short label: HTML, JS, CSS, FONT, IMG, XHR, OTHER. */
  type: string;
  start: number;
  duration: number;
  /** Full resource URL for the tooltip. */
  title?: string;
}
export function Waterfall({
  requests,
  timelineMs,
  measured,
}: {
  requests: readonly WaterfallRequest[];
  timelineMs: number;
  /** False for illustrative sample timings. */
  measured: boolean;
}) {
  const t = useMessages(MESSAGES);
  const ticks = [0, 1, 2, 3].map((step) => Math.round((timelineMs * step) / 3));
  return (
    <div className="waterfall">
      <div className="waterfall-scale">
        <span>{t.resource}</span>
        <div className="waterfall-ticks">
          {ticks.map((tick, index) => (
            <span key={index}>
              {formatCount(tick)}
              {index === 0 ? " ms" : ""}
            </span>
          ))}
        </div>
      </div>
      {requests.map(({ name, type, start, duration, title }, index) => (
        <div className="waterfall-row" key={`${index}-${name}`}>
          <span title={title}>
            <span className="waterfall-name">{name}</span>
            <small>{type}</small>
          </span>
          <div className="waterfall-track">
            <i
              className={`bar bar-${type}`}
              style={{
                marginLeft: `${(start / timelineMs) * 100}%`,
                width: `${Math.max((duration / timelineMs) * 100, 0.5)}%`,
              }}
              title={t.timing(name, start, duration, measured)}
            />
            <span className="sr-only">
              {t.timing(name, start, duration, measured)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
