import type { MetadataRoute } from "next";
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from "@/application/app-info";

// Required for `output: "export"`: the manifest is rendered once at build time.
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${APP_NAME} – ${APP_TAGLINE.hu}`,
    short_name: APP_NAME,
    description: APP_DESCRIPTION.hu,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#c9d4e2",
    theme_color: "#14213d",
    lang: "hu",
    categories: ["education", "navigation"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "BA épület – belső térkép",
        short_name: "BA épület",
        url: "/building/ba/",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
