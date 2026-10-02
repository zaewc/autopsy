/** Lab vitals for browser scans; limits are web.dev [good, needs improvement] bounds. */
export const LAB_VITALS = [
  {
    key: "lcpMs",
    name: "Largest Contentful Paint",
    short: "LCP",
    limits: [2500, 4000],
  },
  {
    key: "cls",
    name: "Cumulative Layout Shift",
    short: "CLS",
    limits: [0.1, 0.25],
  },
  {
    key: "fcpMs",
    name: "First Contentful Paint",
    short: "FCP",
    limits: [1800, 3000],
  },
  {
    key: "ttfbMs",
    name: "Time to First Byte",
    short: "TTFB",
    limits: [800, 1800],
  },
] as const;

export type VitalRating = "good" | "needs-improvement" | "poor";

export function rateVital(
  value: number,
  [good, poor]: readonly [number, number],
): { rating: VitalRating; tone: "good" | "warn" } {
  if (value <= good) return { rating: "good", tone: "good" };
  if (value <= poor) return { rating: "needs-improvement", tone: "warn" };
  return { rating: "poor", tone: "warn" };
}

export function displayVital(
  key: (typeof LAB_VITALS)[number]["key"],
  value: number,
) {
  if (key === "cls") return { value: value.toFixed(3), unit: "" };
  return value >= 1000
    ? { value: (value / 1000).toFixed(2), unit: "s" }
    : { value: String(value), unit: "ms" };
}
