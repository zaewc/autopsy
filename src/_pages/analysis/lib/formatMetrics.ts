const integer = new Intl.NumberFormat("en");
const decimal = new Intl.NumberFormat("en", { maximumFractionDigits: 1 });

export const formatMs = (ms: number) => `${integer.format(ms)} ms`;
export const formatCount = (value: number) => integer.format(value);
export const formatKilobytes = (bytes: number) =>
  `${decimal.format(bytes / 1000)} kB`;

/** Short waterfall label for a browser resource type. */
export function resourceLabel(type: string) {
  switch (type) {
    case "document":
      return "HTML";
    case "script":
      return "JS";
    case "stylesheet":
      return "CSS";
    case "font":
      return "FONT";
    case "image":
    case "media":
      return "IMG";
    case "fetch":
    case "xhr":
    case "websocket":
    case "eventsource":
      return "XHR";
    default:
      return "OTHER";
  }
}

/** File name, or host for a bare origin, to keep long URLs readable. */
export function shortUrl(url: string) {
  try {
    const { hostname, pathname } = new URL(url);
    const file = pathname.split("/").filter(Boolean).pop();
    return file ? decodeURIComponent(file) : hostname;
  } catch {
    return url;
  }
}
