/** Minimal HTML scanning for static checks; not a full parser. */
export type Attributes = Record<string, string>;

/** Markup outside scripts, styles, templates, and comments. */
export function visibleMarkup(html: string) {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|template|noscript)\b[\s\S]*?<\/\1\s*>/gi, "");
}

/** Attributes of every opening tag with this name. */
export function tags(markup: string, name: string): Attributes[] {
  return Array.from(
    markup.matchAll(new RegExp(`<${name}\\b([^>]*)>`, "gi")),
    ([, source]) => {
      const attributes: Attributes = {};
      for (const [, key, quoted, single, bare] of source.matchAll(
        /([^\s"'=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g,
      ))
        attributes[key.toLowerCase()] = quoted ?? single ?? bare ?? "";
      return attributes;
    },
  );
}

/** Markup without comments, keeping script and style tags. */
export function withoutComments(html: string) {
  return html.replace(/<!--[\s\S]*?-->/g, "");
}
