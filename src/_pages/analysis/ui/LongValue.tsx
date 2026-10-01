import { formatCount } from "../lib/formatMetrics";
import "./longValue.css";

/** Values longer than this, such as large CSPs, start collapsed. */
const LONG_VALUE = 240;

/** Shows a header or policy value, collapsing very long ones. */
export function LongValue({ value }: { value: string }) {
  if (value.length <= LONG_VALUE) return <>{value}</>;
  return (
    <details className="long-value">
      <summary>
        {value.slice(0, 120)}… ({formatCount(value.length)} characters, show
        all)
      </summary>
      {value}
    </details>
  );
}
