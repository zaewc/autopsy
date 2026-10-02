import { useMessages, type Localized } from "@/shared/lib/i18n";
import { SectionHeading } from "@/shared/ui/section-heading";
import {
  ArchitectureDiagram,
  architectureNodes,
  type AnalysisReport,
} from "@/entities/analysis-report";
const MESSAGES: Localized<{
  title: string;
  observed: string;
  unobservable: string;
  inferred: string;
  liveNote: string;
  sampleNote: string;
}> = {
  en: {
    title: "Architecture signals",
    observed: "Observed",
    unobservable: "Not observable",
    inferred: "Inferred",
    liveNote:
      "Only layers with an observed header or markup signal are drawn, in request order. A missing layer means no signal was found, not that the layer is absent. Private servers, databases, and internal topology are unknown.",
    sampleNote:
      "Only public response headers, document content, and network activity can be observed. The external API is a hypothesis; private servers, databases, and internal topology are unknown.",
  },
  ko: {
    title: "아키텍처 신호",
    observed: "관측",
    unobservable: "관측 불가",
    inferred: "추론",
    liveNote:
      "헤더나 마크업 신호가 관측된 계층만 요청 순서대로 그립니다. 계층이 없다는 것은 신호를 찾지 못했다는 뜻이지 그 계층이 존재하지 않는다는 뜻이 아닙니다. 비공개 서버, 데이터베이스, 내부 토폴로지는 알 수 없습니다.",
    sampleNote:
      "공개 응답 헤더, 문서 내용, 네트워크 활동만 관측할 수 있습니다. 외부 API는 가설이며 비공개 서버, 데이터베이스, 내부 토폴로지는 알 수 없습니다.",
  },
};
export function ArchitectureSection({
  report,
  details = false,
}: {
  report: AnalysisReport;
  details?: boolean;
}) {
  const t = useMessages(MESSAGES);
  const live = report.mode === "live";
  return (
    <section>
      <SectionHeading title={t.title}>
        <div className="legend">
          <span>
            <i />
            {t.observed}
          </span>
          <span>
            <i />
            {live ? t.unobservable : t.inferred}
          </span>
        </div>
      </SectionHeading>
      <ArchitectureDiagram nodes={architectureNodes(report)} />
      {details && (
        <p className="architecture-note">{live ? t.liveNote : t.sampleNote}</p>
      )}
    </section>
  );
}
