/** Illustrative sample timings; the sample report never claims a measurement. */
export const SAMPLE_VITALS = [
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
] as const;

export const SAMPLE_REQUESTS = [
  { name: "document", type: "HTML", start: 0, duration: 360 },
  { name: "main-app.js", type: "JS", start: 225, duration: 855 },
  { name: "framework.js", type: "JS", start: 285, duration: 570 },
  { name: "layout.css", type: "CSS", start: 255, duration: 300 },
  { name: "inter-latin.woff2", type: "FONT", start: 450, duration: 420 },
  { name: "hero.webp", type: "IMG", start: 570, duration: 630 },
];

export const SAMPLE_TRANSFER_KB = 824;
