import type { MetadataRoute } from "next";
import { SITE_URL } from "@/application/app-info";

// Required for `output: "export"`: rendered once at build time.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
