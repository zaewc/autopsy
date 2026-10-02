import type {
  AuditCheck,
  Finding,
  SecuritySeverity,
} from "@/entities/analysis-report";
import type { Localized } from "@/shared/lib/i18n";
import type { VitalRating } from "../lib/vitals";

export const SECURITY_SEVERITY_LABELS: Localized<
  Readonly<Record<SecuritySeverity, string>>
> = {
  en: { high: "high", medium: "medium", low: "low", info: "info" },
  ko: { high: "높음", medium: "중간", low: "낮음", info: "정보" },
};

export const FINDING_SEVERITY_LABELS: Localized<
  Readonly<Record<Finding["severity"], string>>
> = {
  en: { warning: "warning", info: "info" },
  ko: { warning: "경고", info: "정보" },
};

export const AUDIT_STATUS_LABELS: Localized<
  Readonly<Record<AuditCheck["status"], string>>
> = {
  en: { Passed: "Passed", Review: "Review", Manual: "Manual" },
  ko: { Passed: "통과", Review: "검토 필요", Manual: "수동 확인" },
};

export const VITAL_RATING_LABELS: Localized<
  Readonly<Record<VitalRating, string>>
> = {
  en: { good: "Good", "needs-improvement": "Needs improvement", poor: "Poor" },
  ko: { good: "좋음", "needs-improvement": "개선 필요", poor: "나쁨" },
};
