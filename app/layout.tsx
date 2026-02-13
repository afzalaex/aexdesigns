import type { Metadata } from "next";
import { Space_Mono } from "next/font/google";
import { SiteNav } from "@/components/SiteNav";
import "./globals.css";

const siteUrl = process.env.SITE_URL || "https://aex.design";

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Aex Designs",
    template: "%s | Aex Designs",
  },
  description: "Designing for the internet, on the internet.",
  icons: {
    icon: [
      { url: "/assets/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr" className={`theme-dark ${spaceMono.variable}`}>
      <body>
        <div className="site-root">
          <SiteNav />
          <div className="site-content-wrapper">{children}</div>
        </div>
      </body>
    </html>
  );
}
