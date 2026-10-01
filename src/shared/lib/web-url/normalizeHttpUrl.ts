/** Normalize a user-entered public website address without making a request. */
export function normalizeHttpUrl(input: string): URL | null {
  try {
    const text = input.trim();
    const url = new URL(text.includes("://") ? text : `https://${text}`);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      !url.hostname.includes(".") ||
      url.username ||
      url.password
    )
      return null;
    return url;
  } catch {
    return null;
  }
}
