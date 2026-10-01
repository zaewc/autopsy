import { formatCount } from "../lib/formatMetrics";
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
  const ticks = [0, 1, 2, 3].map((step) => Math.round((timelineMs * step) / 3));
  const kind = measured ? "measured" : "simulated";
  return (
    <div className="waterfall">
      <div className="waterfall-scale">
        <span>Resource</span>
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
              title={`${name}: starts at ${start} ms, duration ${duration} ms (${kind})`}
            />
            <span className="sr-only">
              {name}: starts at {start} ms, duration {duration} ms; {kind}{" "}
              timing.
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
