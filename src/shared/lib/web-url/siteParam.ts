/** Compact `?site=` value: HTTPS URLs drop the scheme and a bare trailing slash. */
export function toSiteParam(url: URL): string {
  return url.protocol === "https:"
    ? url.href.slice("https://".length).replace(/^([^/?#]+)\/$/, "$1")
    : url.href;
}
