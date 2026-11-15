import type { Metadata } from "next";
import { campusBuildingById } from "@/data/campus";
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
  return { title: building ? `${building.name.hu} – belső térkép` : "Belső térkép" };
}

export default async function BuildingPage({ params }: Params) {
  const { buildingId } = await params;
  return <BuildingExplorer buildingId={buildingId} />;
}
