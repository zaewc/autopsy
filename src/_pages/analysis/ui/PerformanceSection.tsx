import { useMessages, type Localized } from "@/shared/lib/i18n";
import { SectionHeading } from "@/shared/ui/section-heading";
import { VITAL_RATING_LABELS } from "../config/labels";
import {
  SAMPLE_REQUESTS,
  SAMPLE_TRANSFER_KB,
  SAMPLE_VITALS,
} from "../config/sampleMetrics";
import { Waterfall } from "./Waterfall";

const SAMPLE_RESOURCES = [
  ["javascript", "486 kB", "59%"],
  ["images", "192 kB", "23%"],
  ["fonts", "82 kB", "10%"],
  ["css", "48 kB", "6%"],
  ["other", "16 kB", "2%"],
] as const;
type Resource = (typeof SAMPLE_RESOURCES)[number][0];
const MESSAGES: Localized<{
  network: string;
  performance: string;
  caption: string;
  waterfall: string;
  examples: (count: number) => string;
  transferred: string;
  resources: Readonly<Record<Resource, string>>;
}> = {
  en: {
    network: "Network requests",
    performance: "Performance",
    caption: "Illustrative values · not measured",
    waterfall: "Request waterfall",
    examples: (count) => `${count} example requests`,
    transferred: "Transferred resources",
    resources: {
      javascript: "JavaScript",
      images: "Images",
      fonts: "Fonts",
      css: "CSS",
      other: "Other",
    },
  },
  ko: {
    network: "네트워크 요청",
    performance: "성능",
    caption: "예시 값 · 측정하지 않음",
    waterfall: "요청 waterfall",
    examples: (count) => `예시 요청 ${count}개`,
    transferred: "전송된 리소스",
    resources: {
      javascript: "JavaScript",
      images: "이미지",
      fonts: "폰트",
      css: "CSS",
      other: "기타",
    },
  },
};
export function PerformanceSection({ network = false }: { network?: boolean }) {
  const t = useMessages(MESSAGES);
  const ratings = useMessages(VITAL_RATING_LABELS);
  return (
    <section>
      <SectionHeading title={network ? t.network : t.performance}>
        <span className="muted-caption">{t.caption}</span>
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
            {t.waterfall}
            <span>{t.examples(SAMPLE_REQUESTS.length)}</span>
          </div>
          <Waterfall
            requests={SAMPLE_REQUESTS}
            timelineMs={1500}
            measured={false}
          />
        </div>
        <div className="resource-panel">
          <div className="subheading">
            {t.transferred}
            <span>{SAMPLE_TRANSFER_KB} kB</span>
          </div>
          <div
            className="resource-stack sample"
            aria-label={SAMPLE_RESOURCES.map(
              ([name, , share]) => `${t.resources[name]} ${share}`,
            ).join(", ")}
          >
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          {SAMPLE_RESOURCES.map(([n, s, p], i) => (
            <div className="resource-row" key={n}>
              <i className={`resource-color color-${i}`} />
              <span>{t.resources[n]}</span>
              <strong>{s}</strong>
              <small>{p}</small>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
