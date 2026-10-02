import type { Locale, Localized } from "@/shared/lib/i18n";
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

type Text = Pick<Finding, "title" | "why" | "fix">;
const en = {
  images: (count: number) => `${count} image${count === 1 ? "" : "s"}`,
  noImages: "No img elements in the HTML document",
  language: {
    name: "Document language",
    pass: (lang: string) => `The document declares lang="${lang}"`,
    review: "The html element has no lang attribute",
    title: "Document language is not declared",
    why: "Screen readers use the language to choose pronunciation, and browsers use it for translation and hyphenation.",
    fix: 'Add a lang attribute to the html element, such as lang="en".',
  },
  alt: {
    name: "Image alternative text",
    pass: (images: string) => `All ${images} in the HTML have an alt attribute`,
    review: (missing: number, images: string) =>
      `${missing} of ${images} in the HTML have no alt attribute`,
    title: (missing: number) =>
      `${missing} image${missing === 1 ? " is" : "s are"} missing alternative text`,
    why: "Screen readers cannot describe images without alt text; decorative images need an empty alt.",
    fix: 'Add descriptive alt text, or alt="" for decorative images.',
  },
  size: {
    name: "Image dimensions",
    pass: (images: string) =>
      `All ${images} in the HTML declare width and height`,
    review: (missing: number, images: string) =>
      `${missing} of ${images} in the HTML lack width or height attributes`,
    title: (missing: number) =>
      `${missing} image${missing === 1 ? " lacks" : "s lack"} explicit dimensions`,
    why: "The browser cannot reserve space before these images load, which can cause layout shifts. CSS may already set a size; this check reads attributes only.",
    fix: "Set intrinsic width and height attributes, or a stable CSS aspect-ratio.",
  },
  title: {
    name: "Page title",
    review: "No title element, or it is empty",
    title: "Page has no title",
    why: "Titles name the page in search results, browser tabs, and assistive technology.",
    fix: "Add a concise, descriptive title element to the document head.",
  },
  description: {
    name: "Meta description",
    pass: (length: number, text: string) => `${length} characters: ${text}`,
    review: "No meta description",
    title: "Meta description is missing",
    why: "Search engines may show an arbitrary page excerpt instead of a summary you control.",
    fix: "Add a meta description that summarizes the page in about one or two sentences.",
  },
  canonical: {
    name: "Canonical URL",
    review: "No canonical link element",
    title: "Canonical URL is not declared",
    why: "Without a canonical URL, duplicate addresses for the same page can split search signals.",
    fix: 'Add <link rel="canonical"> pointing to the preferred URL.',
  },
  robots: {
    name: "Robots directives",
    allowed: (robots: string) => `Indexing allowed: ${robots}`,
    none: "No robots directives; indexing is allowed",
    review: (robots: string) => `noindex is set: ${robots}`,
    title: "Page asks search engines not to index it",
    why: "A noindex directive keeps the page out of search results, which is a problem unless it is intentional.",
    fix: "Remove noindex from the robots meta tag or X-Robots-Tag header if the page should be searchable.",
  },
  manual: {
    name: "Manual testing",
    detail:
      "Keyboard, focus, contrast, and assistive technology testing cannot be done from HTML alone",
  },
};
const MESSAGES: Localized<typeof en> = {
  en,
  ko: {
    images: (count) => `이미지 ${count}개`,
    noImages: "HTML 문서에 img 요소가 없습니다",
    language: {
      name: "문서 언어",
      pass: (lang) => `문서가 lang="${lang}"을 선언합니다`,
      review: "html 요소에 lang 속성이 없습니다",
      title: "문서 언어가 선언되지 않았습니다",
      why: "스크린 리더는 언어로 발음을 정하고, 브라우저는 번역과 하이픈 처리에 사용합니다.",
      fix: 'html 요소에 lang="ko" 같은 lang 속성을 추가하세요.',
    },
    alt: {
      name: "이미지 대체 텍스트",
      pass: (images) => `HTML의 ${images} 모두 alt 속성이 있습니다`,
      review: (missing, images) =>
        `HTML의 ${images} 중 ${missing}개에 alt 속성이 없습니다`,
      title: (missing) => `이미지 ${missing}개에 대체 텍스트가 없습니다`,
      why: "alt 텍스트가 없으면 스크린 리더가 이미지를 설명할 수 없습니다. 장식용 이미지는 빈 alt가 필요합니다.",
      fix: '설명하는 alt 텍스트를 추가하고, 장식용 이미지에는 alt=""를 지정하세요.',
    },
    size: {
      name: "이미지 크기",
      pass: (images) => `HTML의 ${images} 모두 width와 height를 선언합니다`,
      review: (missing, images) =>
        `HTML의 ${images} 중 ${missing}개에 width 또는 height 속성이 없습니다`,
      title: (missing) => `이미지 ${missing}개에 명시적인 크기가 없습니다`,
      why: "이미지가 로드되기 전에 브라우저가 공간을 확보할 수 없어 layout shift가 생길 수 있습니다. CSS에서 이미 크기를 지정했을 수 있으며, 이 점검은 속성만 읽습니다.",
      fix: "고유 width와 height 속성을 지정하거나 안정적인 CSS aspect-ratio를 사용하세요.",
    },
    title: {
      name: "페이지 제목",
      review: "title 요소가 없거나 비어 있습니다",
      title: "페이지에 제목이 없습니다",
      why: "제목은 검색 결과, 브라우저 탭, 보조 기술에서 페이지 이름으로 쓰입니다.",
      fix: "문서 head에 간결하고 설명적인 title 요소를 추가하세요.",
    },
    description: {
      name: "Meta description",
      pass: (length, text) => `${length}자: ${text}`,
      review: "meta description이 없습니다",
      title: "Meta description이 없습니다",
      why: "검색 엔진이 직접 정한 요약 대신 페이지의 임의 부분을 보여 줄 수 있습니다.",
      fix: "페이지를 한두 문장으로 요약하는 meta description을 추가하세요.",
    },
    canonical: {
      name: "Canonical URL",
      review: "canonical link 요소가 없습니다",
      title: "Canonical URL이 선언되지 않았습니다",
      why: "canonical URL이 없으면 같은 페이지의 여러 주소로 검색 신호가 나뉠 수 있습니다.",
      fix: '선호하는 URL을 가리키는 <link rel="canonical">을 추가하세요.',
    },
    robots: {
      name: "Robots 지시어",
      allowed: (robots) => `색인 허용: ${robots}`,
      none: "robots 지시어가 없어 색인이 허용됩니다",
      review: (robots) => `noindex가 설정됨: ${robots}`,
      title: "페이지가 검색 엔진에 색인하지 말라고 요청합니다",
      why: "noindex 지시어는 페이지를 검색 결과에서 제외하므로 의도한 것이 아니라면 문제가 됩니다.",
      fix: "페이지가 검색되어야 한다면 robots meta 태그나 X-Robots-Tag 헤더에서 noindex를 제거하세요.",
    },
    manual: {
      name: "수동 테스트",
      detail:
        "키보드, 포커스, 대비, 보조 기술 테스트는 HTML만으로는 할 수 없습니다",
    },
  },
};

interface Rule {
  area: AuditArea;
  name: string;
  /** Returns the passing detail, or null when the check needs review. */
  pass: () => string | null;
  /** Evidence shown when the check needs review. */
  review: string;
  finding?: Text & Pick<Finding, "severity">;
}

/**
 * Check one HTML response for document semantics and search metadata. These
 * are static checks of a single document, not a full accessibility audit;
 * security is reviewed separately by analyzeSecurity and analyzeContent.
 */
export function auditDocument(
  { headers, html }: AuditInput,
  locale: Locale = "en",
): {
  checks: AuditCheck[];
  findings: Finding[];
} {
  const t = MESSAGES[locale];
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
  const imageCount = t.images(images.length);
  const rules: Rule[] = [
    {
      area: "Accessibility",
      name: t.language.name,
      pass: () => (language ? t.language.pass(language) : null),
      review: t.language.review,
      finding: {
        severity: "warning",
        title: t.language.title,
        why: t.language.why,
        fix: t.language.fix,
      },
    },
    {
      area: "Accessibility",
      name: t.alt.name,
      pass: () =>
        missingAlt ? null : images.length ? t.alt.pass(imageCount) : t.noImages,
      review: t.alt.review(missingAlt, imageCount),
      finding: {
        severity: "warning",
        title: t.alt.title(missingAlt),
        why: t.alt.why,
        fix: t.alt.fix,
      },
    },
    {
      area: "Accessibility",
      name: t.size.name,
      pass: () =>
        missingSize
          ? null
          : images.length
            ? t.size.pass(imageCount)
            : t.noImages,
      review: t.size.review(missingSize, imageCount),
      finding: {
        severity: "info",
        title: t.size.title(missingSize),
        why: t.size.why,
        fix: t.size.fix,
      },
    },
    {
      area: "SEO",
      name: t.title.name,
      pass: () => (title ? excerpt(title) : null),
      review: t.title.review,
      finding: {
        severity: "warning",
        title: t.title.title,
        why: t.title.why,
        fix: t.title.fix,
      },
    },
    {
      area: "SEO",
      name: t.description.name,
      pass: () =>
        description
          ? t.description.pass(description.length, excerpt(description, 60))
          : null,
      review: t.description.review,
      finding: {
        severity: "info",
        title: t.description.title,
        why: t.description.why,
        fix: t.description.fix,
      },
    },
    {
      area: "SEO",
      name: t.canonical.name,
      pass: () => (canonical ? excerpt(canonical) : null),
      review: t.canonical.review,
      finding: {
        severity: "info",
        title: t.canonical.title,
        why: t.canonical.why,
        fix: t.canonical.fix,
      },
    },
    {
      area: "SEO",
      name: t.robots.name,
      pass: () =>
        /noindex/i.test(robots)
          ? null
          : robots
            ? t.robots.allowed(excerpt(robots, 60))
            : t.robots.none,
      review: t.robots.review(excerpt(robots, 60)),
      finding: {
        severity: "info",
        title: t.robots.title,
        why: t.robots.why,
        fix: t.robots.fix,
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
    name: t.manual.name,
    status: "Manual",
    detail: t.manual.detail,
  });
  findings.sort((a, b) =>
    a.severity === b.severity ? 0 : a.severity === "warning" ? -1 : 1,
  );
  return { checks, findings };
}
