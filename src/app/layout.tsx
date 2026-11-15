import type { Metadata, Viewport } from "next";
import "@fontsource-variable/overpass";
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from "@/application/app-info";
import { I18nProvider } from "@/presentation/i18n/I18nProvider";
import { PwaRoot } from "@/presentation/pwa/PwaRoot";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${APP_NAME} – ${APP_TAGLINE.hu}`, template: `%s · ${APP_NAME}` },
  description: APP_DESCRIPTION.hu,
  applicationName: APP_NAME,
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#14213d",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="hu">
      <body>
        <I18nProvider>
          {children}
          <PwaRoot />
        </I18nProvider>
      </body>
    </html>
  );
}
