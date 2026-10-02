import { useMessages } from "@/shared/lib/i18n";
import { SectionHeading } from "@/shared/ui/section-heading";
import { VITAL_RATING_LABELS } from "../config/labels";
import {
  SAMPLE_REQUESTS,
  SAMPLE_TRANSFER_KB,
  SAMPLE_VITALS,
} from "../config/sampleMetrics";
import { Waterfall } from "./Waterfall";
export function PerformanceSection({ network = false }: { network?: boolean }) {
  const ratings = useMessages(VITAL_RATING_LABELS);
  return (
    <section>
      <SectionHeading title={network ? "Network requests" : "Performance"}>
        <span className="muted-caption">
          Illustrative values · not measured
        </span>
      </SectionHeading>
      <div className="vitals">
        {SAMPLE_VITALS.map((v) => (
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
                {ratings[v.rating]}
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
            Transferred resources<span>{SAMPLE_TRANSFER_KB} kB</span>
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
