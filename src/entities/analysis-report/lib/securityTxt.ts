import type { Locale, Localized } from "@/shared/lib/i18n";
import type { SecurityIssue, SecurityTxt } from "../model/types";

const RFC = {
  label: "RFC 9116: security.txt",
  url: "https://www.rfc-editor.org/rfc/rfc9116",
};

/**
 * Read a security.txt body (RFC 9116). Returns null when the text has no
 * Contact field, which also covers sites that answer every path with HTML.
 */
export function parseSecurityTxt(
  url: string,
  text: string,
  now = new Date(),
): SecurityTxt | null {
  const fields = new Map<string, string[]>();
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z-]+):\s*(.+?)\s*$/);
    if (!match) continue;
    const key = match[1].toLowerCase();
    fields.set(key, [...(fields.get(key) ?? []), match[2]]);
  }
  const contact = fields.get("contact") ?? [];
  if (!contact.length) return null;
  const expires = fields.get("expires")?.[0] ?? null;
  const time = expires ? Date.parse(expires) : NaN;
  return {
    url,
    contact,
    expires,
    expired: !Number.isNaN(time) && time < now.getTime(),
    policy: fields.get("policy")?.[0] ?? null,
  };
}

const en = {
  missing: {
    title: "No security.txt contact",
    evidence: (origin: string) =>
      `${origin}/.well-known/security.txt did not return a file with a Contact field.`,
    impact:
      "Researchers who find a vulnerability have no published way to report it.",
    fix: "Publish /.well-known/security.txt with Contact and Expires fields.",
  },
  expired: {
    title: "security.txt has expired",
    impact:
      "An expired file signals that the contact details may no longer be monitored.",
    fix: "Update the Expires field and confirm the contacts are current.",
  },
};
const MESSAGES: Localized<typeof en> = {
  en,
  ko: {
    missing: {
      title: "security.txt 연락처가 없습니다",
      evidence: (origin) =>
        `${origin}/.well-known/security.txt가 Contact 필드가 있는 파일을 반환하지 않았습니다.`,
      impact: "취약점을 발견한 연구자가 이를 제보할 공개 경로가 없습니다.",
      fix: "Contact와 Expires 필드가 있는 /.well-known/security.txt를 게시하세요.",
    },
    expired: {
      title: "security.txt가 만료되었습니다",
      impact:
        "만료된 파일은 연락처를 더 이상 확인하지 않을 수 있다는 신호입니다.",
      fix: "Expires 필드를 갱신하고 연락처가 최신인지 확인하세요.",
    },
  },
};

/** Issues for a missing or expired security.txt. */
export function securityTxtIssues(
  origin: string,
  found: SecurityTxt | null,
  locale: Locale = "en",
): SecurityIssue[] {
  const t = MESSAGES[locale];
  if (!found)
    return [
      {
        id: "disclosure-security-txt-missing",
        category: "Disclosure",
        severity: "info",
        title: t.missing.title,
        evidence: t.missing.evidence(origin),
        impact: t.missing.impact,
        fix: t.missing.fix,
        references: [RFC],
      },
    ];
  if (found.expired)
    return [
      {
        id: "disclosure-security-txt-expired",
        category: "Disclosure",
        severity: "low",
        title: t.expired.title,
        evidence: `Expires: ${found.expires}`,
        impact: t.expired.impact,
        fix: t.expired.fix,
        references: [RFC],
      },
    ];
  return [];
}
