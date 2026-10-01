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

/** Issues for a missing or expired security.txt. */
export function securityTxtIssues(
  origin: string,
  found: SecurityTxt | null,
): SecurityIssue[] {
  if (!found)
    return [
      {
        id: "disclosure-security-txt-missing",
        category: "Disclosure",
        severity: "info",
        title: "No security.txt contact",
        evidence: `${origin}/.well-known/security.txt did not return a file with a Contact field.`,
        impact:
          "Researchers who find a vulnerability have no published way to report it.",
        fix: "Publish /.well-known/security.txt with Contact and Expires fields.",
        references: [RFC],
      },
    ];
  if (found.expired)
    return [
      {
        id: "disclosure-security-txt-expired",
        category: "Disclosure",
        severity: "low",
        title: "security.txt has expired",
        evidence: `Expires: ${found.expires}`,
        impact:
          "An expired file signals that the contact details may no longer be monitored.",
        fix: "Update the Expires field and confirm the contacts are current.",
        references: [RFC],
      },
    ];
  return [];
}
