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
