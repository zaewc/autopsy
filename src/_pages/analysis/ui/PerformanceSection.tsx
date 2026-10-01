import { SectionHeading } from "@/shared/ui/section-heading";
import { Waterfall } from "./Waterfall";
export function PerformanceSection({ network = false }: { network?: boolean }) {
  return (
    <section>
      <SectionHeading
        number="02"
        title={network ? "Network requests" : "Performance"}
      >
        <span className="muted-caption">
          <span className="green-dot" /> Simulated lab measurements
        </span>
      </SectionHeading>
      <div className="vitals">
        {[
          {
            name: "Largest Contentful Paint",
            short: "LCP",
            value: "1.2",
            unit: "s",
            good: true,
            caption: "Good",
            limit: "≤ 2.5 s",
            bars: [24, 38, 29, 46, 31, 40, 26, 32, 22, 28, 25, 20],
          },
          {
            name: "Interaction to Next Paint",
            short: "INP",
            value: "84",
            unit: "ms",
            good: true,
            caption: "Good",
            limit: "≤ 200 ms",
            bars: [20, 29, 35, 22, 40, 29, 34, 22, 30, 23, 24, 19],
          },
          {
            name: "Cumulative Layout Shift",
            short: "CLS",
            value: "0.04",
            unit: "",
            good: true,
            caption: "Good",
            limit: "≤ 0.1",
            bars: [18, 18, 33, 18, 18, 18, 25, 18, 18, 18, 18, 18],
          },
          {
            name: "First Contentful Paint",
            short: "FCP",
            value: "0.8",
            unit: "s",
            good: true,
            caption: "Good",
            limit: "≤ 1.8 s",
            bars: [40, 36, 43, 30, 34, 27, 35, 23, 28, 20, 25, 19],
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
              <div
                className="spark"
                role="img"
                aria-label={`${v.short}: 12 illustrative measurements, latest ${v.value} ${v.unit}`}
                title="12 illustrative measurements; the latest value is shown at left"
              >
                {v.bars.map((h, i) => (
                  <i
                    key={i}
                    style={{ height: h }}
                    title={`Sample ${i + 1}: ${((Number(v.value) * h) / v.bars[v.bars.length - 1]).toFixed(2)} ${v.unit}`}
                  />
                ))}
              </div>
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
            Request waterfall<span>6 of 42 requests · sample</span>
          </div>
          <Waterfall />
        </div>
        <div className="resource-panel">
          <div className="subheading">
            Transferred resources<span>824 kB</span>
          </div>
          <div
            className="resource-stack"
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
