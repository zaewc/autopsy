import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Webopsy — Put the web under a microscope",
  description:
    "Explore the technical anatomy of a website. A precise diagnostic workspace for the modern web.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
