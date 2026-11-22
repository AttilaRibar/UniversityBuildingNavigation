import type { MetadataRoute } from "next";
import { SITE_URL } from "@/application/app-info";
import { buildingHref } from "@/application/links";
import { INDOOR_BUILDING_IDS } from "@/data/buildings";

// Required for `output: "export"`: rendered once at build time.
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "monthly", priority: 1 },
    ...INDOOR_BUILDING_IDS.map((id) => ({ url: `${SITE_URL}${buildingHref(id)}`, changeFrequency: "monthly" as const, priority: 0.8 })),
    { url: `${SITE_URL}/privacy/`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
