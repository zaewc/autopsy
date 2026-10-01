import type { AuditCheck, AuditArea, Finding } from "../model/types";
import { tags, visibleMarkup } from "./markup";

export interface AuditInput {
  /** Lower-cased response header names. */
  headers: Readonly<Record<string, string>>;
  html: string;
}

const ENTITIES: Readonly<Record<string, string>> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(text: string) {
  return text.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (entity, code: string) => {
    if (code[0] !== "#") return ENTITIES[code.toLowerCase()] ?? entity;
    const hex = code[1].toLowerCase() === "x";
    const point = parseInt(code.slice(hex ? 2 : 1), hex ? 16 : 10);
    return point > 0 && point <= 0x10ffff
      ? String.fromCodePoint(point)
      : entity;
  });
}

function excerpt(text: string, length = 80) {
  const compact = decodeEntities(text).replace(/\s+/g, " ").trim();
  return compact.length > length ? `${compact.slice(0, length - 1)}…` : compact;
}

interface Rule {
  area: AuditArea;
  name: string;
  /** Returns the passing detail, or null when the check needs review. */
  pass: () => string | null;
  /** Evidence shown when the check needs review. */
  review: string;
  finding?: Omit<Finding, "detail" | "tag">;
}

/**
 * Check one HTML response for document semantics and search metadata. These
 * are static checks of a single document, not a full accessibility audit;
 * security is reviewed separately by analyzeSecurity and analyzeContent.
 */
export function auditDocument({ headers, html }: AuditInput): {
  checks: AuditCheck[];
  findings: Finding[];
} {
  const markup = visibleMarkup(html);
  const meta = (name: string) =>
    tags(markup, "meta").find(
      (attributes) => attributes.name?.toLowerCase() === name,
    )?.content;
  const images = tags(markup, "img");
  const missingAlt = images.filter((image) => !("alt" in image)).length;
  const missingSize = images.filter(
    (image) => !image.width || !image.height,
  ).length;
  const title = markup.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1].trim();
  const description = decodeEntities(meta("description") ?? "").trim();
  const canonical = tags(markup, "link").find((link) =>
    link.rel?.toLowerCase().split(/\s+/).includes("canonical"),
  )?.href;
  const robots = [meta("robots"), headers["x-robots-tag"]]
    .filter(Boolean)
    .join(", ");
  const language = tags(markup, "html")[0]?.lang?.trim();
  const imageCount = `${images.length} image${images.length === 1 ? "" : "s"}`;
  const rules: Rule[] = [
    {
      area: "Accessibility",
      name: "Document language",
      pass: () =>
        language ? `The document declares lang="${language}"` : null,
      review: "The html element has no lang attribute",
      finding: {
        severity: "warning",
        title: "Document language is not declared",
        why: "Screen readers use the language to choose pronunciation, and browsers use it for translation and hyphenation.",
        fix: 'Add a lang attribute to the html element, such as lang="en".',
      },
    },
    {
      area: "Accessibility",
      name: "Image alternative text",
      pass: () =>
        missingAlt
          ? null
          : images.length
            ? `All ${imageCount} in the HTML have an alt attribute`
            : "No img elements in the HTML document",
      review: `${missingAlt} of ${imageCount} in the HTML have no alt attribute`,
      finding: {
        severity: "warning",
        title: `${missingAlt} image${missingAlt === 1 ? " is" : "s are"} missing alternative text`,
        why: "Screen readers cannot describe images without alt text; decorative images need an empty alt.",
        fix: 'Add descriptive alt text, or alt="" for decorative images.',
      },
    },
    {
      area: "Accessibility",
      name: "Image dimensions",
      pass: () =>
        missingSize
          ? null
          : images.length
            ? `All ${imageCount} in the HTML declare width and height`
            : "No img elements in the HTML document",
      review: `${missingSize} of ${imageCount} in the HTML lack width or height attributes`,
      finding: {
        severity: "info",
        title: `${missingSize} image${missingSize === 1 ? " lacks" : "s lack"} explicit dimensions`,
        why: "The browser cannot reserve space before these images load, which can cause layout shifts. CSS may already set a size; this check reads attributes only.",
        fix: "Set intrinsic width and height attributes, or a stable CSS aspect-ratio.",
      },
    },
    {
      area: "SEO",
      name: "Page title",
      pass: () => (title ? excerpt(title) : null),
      review: "No title element, or it is empty",
      finding: {
        severity: "warning",
        title: "Page has no title",
        why: "Titles name the page in search results, browser tabs, and assistive technology.",
        fix: "Add a concise, descriptive title element to the document head.",
      },
    },
    {
      area: "SEO",
      name: "Meta description",
      pass: () =>
        description
          ? `${description.length} characters: ${excerpt(description, 60)}`
          : null,
      review: "No meta description",
      finding: {
        severity: "info",
        title: "Meta description is missing",
        why: "Search engines may show an arbitrary page excerpt instead of a summary you control.",
        fix: "Add a meta description that summarizes the page in about one or two sentences.",
      },
    },
    {
      area: "SEO",
      name: "Canonical URL",
      pass: () => (canonical ? excerpt(canonical) : null),
      review: "No canonical link element",
      finding: {
        severity: "info",
        title: "Canonical URL is not declared",
        why: "Without a canonical URL, duplicate addresses for the same page can split search signals.",
        fix: 'Add <link rel="canonical"> pointing to the preferred URL.',
      },
    },
    {
      area: "SEO",
      name: "Robots directives",
      pass: () =>
        /noindex/i.test(robots)
          ? null
          : robots
            ? `Indexing allowed: ${excerpt(robots, 60)}`
            : "No robots directives; indexing is allowed",
      review: `noindex is set: ${excerpt(robots, 60)}`,
      finding: {
        severity: "info",
        title: "Page asks search engines not to index it",
        why: "A noindex directive keeps the page out of search results, which is a problem unless it is intentional.",
        fix: "Remove noindex from the robots meta tag or X-Robots-Tag header if the page should be searchable.",
      },
    },
  ];
  const checks: AuditCheck[] = [];
  const findings: Finding[] = [];
  for (const rule of rules) {
    const passed = rule.pass();
    checks.push({
      area: rule.area,
      name: rule.name,
      status: passed === null ? "Review" : "Passed",
      detail: passed ?? rule.review,
    });
    if (passed === null && rule.finding)
      findings.push({ ...rule.finding, detail: rule.review, tag: rule.area });
  }
  checks.push({
    area: "Accessibility",
    name: "Manual testing",
    status: "Manual",
    detail:
      "Keyboard, focus, contrast, and assistive technology testing cannot be done from HTML alone",
  });
  findings.sort((a, b) =>
    a.severity === b.severity ? 0 : a.severity === "warning" ? -1 : 1,
  );
  return { checks, findings };
}
