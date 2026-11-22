import type { Metadata } from "next";
import { campusBuildingById } from "@/data/campus";
import { APP_NAME } from "@/application/app-info";
import { buildingHref } from "@/application/links";
import { INDOOR_BUILDING_IDS } from "@/data/buildings";
import { BuildingExplorer } from "@/presentation/building/BuildingExplorer";

type Params = { params: Promise<{ buildingId: string }> };

/** One static page per building that has indoor data. */
export function generateStaticParams() {
  return INDOOR_BUILDING_IDS.map((buildingId) => ({ buildingId }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { buildingId } = await params;
  const building = campusBuildingById(buildingId);
  const title = building ? `${building.name.hu} – belső térkép` : "Belső térkép";
  const description = building
    ? `${building.name.hu} (${building.address}): 3D belső térkép, teremkereső és útvonal a bejárattól a terem ajtajáig.`
    : undefined;
  const url = buildingHref(buildingId);
  return {
    title,
    description,
    alternates: { canonical: url },
    // A child openGraph replaces the parent's, so the preview image is repeated here.
    openGraph: { title: `${title} · ${APP_NAME}`, description, url, images: [{ url: "/og-image.png", width: 1200, height: 630 }] },
  };
}

export default async function BuildingPage({ params }: Params) {
  const { buildingId } = await params;
  return <BuildingExplorer buildingId={buildingId} />;
}
