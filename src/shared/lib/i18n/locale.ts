export const LOCALES = ["en", "ko"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
/** Holds an explicit language choice; it overrides Accept-Language. */
export const LOCALE_COOKIE = "autopsy-locale";

/** One value per locale, such as a message table. */
export type Localized<T> = Readonly<Record<Locale, T>>;

export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}

/** The best supported language in an Accept-Language header, by quality. */
function preferredLocale(header: string): Locale | null {
  const ranked = header
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params
        .map((param) => param.trim().match(/^q=([\d.]+)$/)?.[1])
        .find(Boolean);
      return {
        language: tag.trim().toLowerCase().split("-")[0],
        quality: q === undefined ? 1 : Number(q),
        index,
      };
    })
    .filter(({ quality }) => quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);
  const match = ranked.find(({ language }) => isLocale(language));
  return match ? (match.language as Locale) : null;
}

/** A saved choice first, then the browser's languages, then English. */
export function resolveLocale(
  cookie: string | undefined,
  acceptLanguage: string | null,
): Locale {
  if (isLocale(cookie)) return cookie;
  return (acceptLanguage && preferredLocale(acceptLanguage)) || DEFAULT_LOCALE;
}
