import type { Metadata } from "next";
import { Space_Mono } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { SiteBreadcrumbBar, SiteSocialFooter } from "@/components/SiteFooterNav";
import { SiteNav } from "@/components/SiteNav";
import "./globals.css";

const siteUrl = (process.env.SITE_URL?.trim() || "https://aex.design").replace(
  /\/+$/,
  ""
);
const googleSiteVerification = process.env.GOOGLE_SITE_VERIFICATION?.trim();
const previewTitle = "Aex Designs";
const previewDescription = "Intangible internet things by Afzal";
const previewImagePath = "/icon-512.png";
const previewImageUrl = new URL(previewImagePath, siteUrl).toString();
const socialProfiles = [
  "https://x.com/aexdesigns",
  "https://instagram.com/aex_designs",
  "https://github.com/afzalaex",
];

const siteStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: previewTitle,
      url: siteUrl,
      logo: previewImageUrl,
      sameAs: socialProfiles,
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name: previewTitle,
      url: siteUrl,
      description: previewDescription,
      publisher: {
        "@id": `${siteUrl}/#organization`,
      },
    },
  ],
};

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: previewTitle,
  title: {
    default: previewTitle,
    template: `%s | ${previewTitle}`,
  },
  description: previewDescription,
  authors: [{ name: previewTitle, url: siteUrl }],
  creator: previewTitle,
  publisher: previewTitle,
  category: "design",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  ...(googleSiteVerification
    ? { verification: { google: googleSiteVerification } }
    : {}),
  openGraph: {
    type: "website",
    url: "/",
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
    site: "@aexdesigns",
    creator: "@aexdesigns",
    title: previewTitle,
    description: previewDescription,
    images: [previewImagePath],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/assets/favicon.svg", type: "image/svg+xml" },
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(siteStructuredData),
          }}
        />
        <div className="site-root">
          <SiteNav />
          <SiteBreadcrumbBar />
          <div className="site-content-wrapper">{children}</div>
          <SiteSocialFooter />
        </div>
        <Analytics />
        <Script src="https://visitoralerts.com/tracker.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}
