import type { Metadata } from "next";
import { LocaleProvider, type Localized } from "@/shared/lib/i18n";
import { requestLocale } from "@/shared/lib/i18n/index.server";
import "../styles/globals.css";

const METADATA: Localized<Metadata> = {
  en: {
    title: "autopsy — Put the web under a microscope",
    description:
      "Explore the technical anatomy of a website. A precise diagnostic workspace for the modern web.",
  },
  ko: {
    title: "autopsy — 웹을 현미경 아래에",
    description:
      "웹사이트의 기술적 구조를 살펴보세요. 현대 웹을 위한 정밀한 진단 작업 공간입니다.",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  return METADATA[await requestLocale()];
}

export async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await requestLocale();
  return (
    <html lang={locale}>
      <body>
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
