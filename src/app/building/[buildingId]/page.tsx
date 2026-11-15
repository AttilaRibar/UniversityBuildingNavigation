import { INDOOR_BUILDING_IDS } from "@/data/buildings";
import { BuildingExplorer } from "@/presentation/building/BuildingExplorer";

export function generateStaticParams() {
  return INDOOR_BUILDING_IDS.map((buildingId) => ({ buildingId }));
}

export default async function BuildingPage({ params }: { params: Promise<{ buildingId: string }> }) {
  const { buildingId } = await params;
  return <BuildingExplorer buildingId={buildingId} />;
}
