const REQUESTS = [
  { name: "document", type: "HTML", start: 0, duration: 360 },
  { name: "main-app.js", type: "JS", start: 225, duration: 855 },
  { name: "framework.js", type: "JS", start: 285, duration: 570 },
  { name: "layout.css", type: "CSS", start: 255, duration: 300 },
  { name: "inter-latin.woff2", type: "FONT", start: 450, duration: 420 },
  { name: "hero.webp", type: "IMG", start: 570, duration: 630 },
];
const TIMELINE_MS = 1500;
export function Waterfall() {
  return (
    <div className="waterfall">
      <div className="waterfall-scale">
        <span>Resource</span>
        <div className="waterfall-ticks">
          <span>0 ms</span>
          <span>500</span>
          <span>1,000</span>
          <span>1,500</span>
        </div>
      </div>
      {REQUESTS.map(({ name, type, start, duration }) => (
        <div className="waterfall-row" key={name}>
          <span>
            {name}
            <small>{type}</small>
          </span>
          <div className="waterfall-track">
            <i
              className={`bar bar-${type}`}
              style={{
                marginLeft: `${(start / TIMELINE_MS) * 100}%`,
                width: `${(duration / TIMELINE_MS) * 100}%`,
              }}
              title={`${name}: starts at ${start} ms, duration ${duration} ms (sample)`}
            />
            <span className="sr-only">
              {name}: starts at {start} ms, duration {duration} ms; simulated
              timing.
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
