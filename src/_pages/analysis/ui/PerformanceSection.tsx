import { SectionHeading } from "@/shared/ui/section-heading";
import { Waterfall } from "./Waterfall";
const SAMPLE_REQUESTS = [
  { name: "document", type: "HTML", start: 0, duration: 360 },
  { name: "main-app.js", type: "JS", start: 225, duration: 855 },
  { name: "framework.js", type: "JS", start: 285, duration: 570 },
  { name: "layout.css", type: "CSS", start: 255, duration: 300 },
  { name: "inter-latin.woff2", type: "FONT", start: 450, duration: 420 },
  { name: "hero.webp", type: "IMG", start: 570, duration: 630 },
];
export function PerformanceSection({ network = false }: { network?: boolean }) {
  return (
    <section>
      <SectionHeading title={network ? "Network requests" : "Performance"}>
        <span className="muted-caption">
          Illustrative values · not measured
        </span>
      </SectionHeading>
      <div className="vitals">
        {[
          {
            name: "Largest Contentful Paint",
            short: "LCP",
            value: "1.2",
            unit: "s",
            caption: "Good",
            limit: "≤ 2.5 s",
          },
          {
            name: "Interaction to Next Paint",
            short: "INP",
            value: "84",
            unit: "ms",
            caption: "Good",
            limit: "≤ 200 ms",
          },
          {
            name: "Cumulative Layout Shift",
            short: "CLS",
            value: "0.04",
            unit: "",
            caption: "Good",
            limit: "≤ 0.1",
          },
          {
            name: "First Contentful Paint",
            short: "FCP",
            value: "0.8",
            unit: "s",
            caption: "Good",
            limit: "≤ 1.8 s",
          },
        ].map((v) => (
          <div className="vital" key={v.short}>
            <div className="vital-label">
              {v.name}
              <span>{v.short}</span>
            </div>
            <div className="vital-value">
              {v.value}
              <span>{v.unit}</span>
            </div>
            <div className="vital-footer">
              <span>
                <i />
                {v.caption}
              </span>
              <span>{v.limit}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="performance-details">
        <div className="requests-panel">
          <div className="subheading">
            Request waterfall<span>6 example requests</span>
          </div>
          <Waterfall
            requests={SAMPLE_REQUESTS}
            timelineMs={1500}
            measured={false}
          />
        </div>
        <div className="resource-panel">
          <div className="subheading">
            Transferred resources<span>824 kB</span>
          </div>
          <div
            className="resource-stack sample"
            aria-label="JavaScript 59%, images 23%, fonts 10%, CSS 6%, other 2%"
          >
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          {[
            ["JavaScript", "486 kB", "59%"],
            ["Images", "192 kB", "23%"],
            ["Fonts", "82 kB", "10%"],
            ["CSS", "48 kB", "6%"],
            ["Other", "16 kB", "2%"],
          ].map(([n, s, p], i) => (
            <div className="resource-row" key={n}>
              <i className={`resource-color color-${i}`} />
              <span>{n}</span>
              <strong>{s}</strong>
              <small>{p}</small>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
