import { useMessages, type Localized } from "@/shared/lib/i18n";
const MESSAGES: Localized<{ scope: string; unknown: string }> = {
  en: {
    scope: "Scope: public response headers, documents, and network signals.",
    unknown: "Private infrastructure is unknown.",
  },
  ko: {
    scope: "범위: 공개 응답 헤더, 문서, 네트워크 신호.",
    unknown: "비공개 인프라는 알 수 없습니다.",
  },
};
export function ReportFooter() {
  const t = useMessages(MESSAGES);
  return (
    <footer>
      <span>{t.scope}</span>
      <span>{t.unknown}</span>
    </footer>
  );
}
