"use client";
import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_LOCALE, type Locale, type Localized } from "./locale";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

/** Supplies the locale the server resolved for this request. */
export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

/** The entry for the current locale, such as a component's message table. */
export function useMessages<T>(messages: Localized<T>): T {
  return messages[useLocale()];
}
