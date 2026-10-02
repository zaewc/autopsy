import {
  Crosshair,
  Layers,
  Activity,
  Network,
  GitBranch,
  ShieldCheck,
  Accessibility,
  Search,
  ListFilter,
} from "lucide-react";
import type { Localized } from "@/shared/lib/i18n";
export const REPORT_SECTIONS = [
  { name: "Overview", icon: Crosshair },
  { name: "Technology", icon: Layers },
  { name: "Performance", icon: Activity },
  { name: "Network", icon: Network },
  { name: "Architecture", icon: GitBranch },
  { name: "Security", icon: ShieldCheck },
  { name: "Accessibility", icon: Accessibility },
  { name: "SEO", icon: Search },
  { name: "Findings", icon: ListFilter },
] as const;

export type ReportSection = (typeof REPORT_SECTIONS)[number]["name"];

export const SECTION_LABELS: Localized<
  Readonly<Record<ReportSection, string>>
> = {
  en: {
    Overview: "Overview",
    Technology: "Technology",
    Performance: "Performance",
    Network: "Network",
    Architecture: "Architecture",
    Security: "Security",
    Accessibility: "Accessibility",
    SEO: "SEO",
    Findings: "Findings",
  },
  ko: {
    Overview: "개요",
    Technology: "기술",
    Performance: "성능",
    Network: "네트워크",
    Architecture: "아키텍처",
    Security: "보안",
    Accessibility: "접근성",
    SEO: "SEO",
    Findings: "발견 사항",
  },
};
