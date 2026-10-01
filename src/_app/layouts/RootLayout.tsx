import type { Metadata } from "next";
import "../styles/globals.css";
export const metadata: Metadata = {
  title: "autopsy — Put the web under a microscope",
  description:
    "Explore the technical anatomy of a website. A precise diagnostic workspace for the modern web.",
};
export function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
