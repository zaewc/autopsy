import { useMessages, type Localized } from "@/shared/lib/i18n";
import { formatCount } from "../lib/formatMetrics";
import "./longValue.css";

/** Values longer than this, such as large CSPs, start collapsed. */
const LONG_VALUE = 240;
const MESSAGES: Localized<{ more: (characters: string) => string }> = {
  en: { more: (characters) => `(${characters} characters, show all)` },
  ko: { more: (characters) => `(${characters}자, 모두 보기)` },
};

/** Shows a header or policy value, collapsing very long ones. */
export function LongValue({ value }: { value: string }) {
  const t = useMessages(MESSAGES);
  if (value.length <= LONG_VALUE) return <>{value}</>;
  return (
    <details className="long-value">
      <summary>
        {value.slice(0, 120)}… {t.more(formatCount(value.length))}
      </summary>
      {value}
    </details>
  );
}
