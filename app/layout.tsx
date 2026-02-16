import type { Metadata } from "next";
import { Space_Mono } from "next/font/google";
import { SiteNav } from "@/components/SiteNav";
import "./globals.css";

const siteUrl = process.env.SITE_URL || "https://www.aex.design";
const previewTitle = "Aex Designs";
const previewDescription = "Intangible internet things.";
const previewImagePath = "/icon-512.png";

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: previewTitle,
    template: `%s | ${previewTitle}`,
  },
  description: previewDescription,
  openGraph: {
    type: "website",
    siteName: previewTitle,
    title: previewTitle,
    description: previewDescription,
    images: [
      {
        url: previewImagePath,
        width: 512,
        height: 512,
        alt: "Aex Designs logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: previewTitle,
    description: previewDescription,
    images: [previewImagePath],
  },
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
