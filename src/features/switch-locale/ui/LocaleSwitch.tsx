"use client";
import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, useLocale, type Locale } from "@/shared/lib/i18n";
import "./localeSwitch.css";

/** Each language's own name, shown to offer switching to it. */
const NAMES: Readonly<Record<Locale, string>> = { en: "English", ko: "한국어" };
const LABELS: Readonly<Record<Locale, string>> = {
  en: "Switch to English",
  ko: "한국어로 보기",
};

/**
 * Saves the other language and re-renders server content in it. Client state
 * such as a shown report is kept; reports keep the language they were scanned in.
 */
export function LocaleSwitch({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const next: Locale = locale === "en" ? "ko" : "en";
  return (
    <button
      type="button"
      className={`locale-switch ${className}`}
      lang={next}
      aria-label={LABELS[next]}
      onClick={() => {
        document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        router.refresh();
      }}
    >
      {NAMES[next]}
    </button>
  );
}
