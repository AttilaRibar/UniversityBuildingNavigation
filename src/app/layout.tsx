import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/overpass";
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE, SITE_URL } from "@/application/app-info";
import { VercelAnalytics } from "@/presentation/analytics/VercelAnalytics";
import { I18nProvider } from "@/presentation/i18n/I18nProvider";
import { PwaRoot } from "@/presentation/pwa/PwaRoot";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${APP_NAME} – ${APP_TAGLINE.hu}`, template: `%s · ${APP_NAME}` },
  description: APP_DESCRIPTION.hu,
  applicationName: APP_NAME,
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false, address: false },
  // Link previews in chat apps: a room link shared in a group chat should look trustworthy.
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: `${APP_NAME} – ${APP_TAGLINE.hu}`,
    description: APP_DESCRIPTION.hu,
    locale: "hu_HU",
    alternateLocale: ["en_US"],
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: `${APP_NAME} – ${APP_TAGLINE.hu}` }],
  },
  twitter: { card: "summary_large_image", images: ["/og-image.png"] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#14213d",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="hu">
      <body>
        <I18nProvider>
          {children}
          <PwaRoot />
        </I18nProvider>
        <VercelAnalytics />
      </body>
    </html>
  );
}
