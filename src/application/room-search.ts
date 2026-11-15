import { INDOOR_BUILDING_IDS, loadIndoorBuilding } from "@/data/buildings";
import { buildSearchIndex, type SearchIndex } from "@/domain/search";

let cached: Promise<SearchIndex> | null = null;

/** Search index over every building with indoor data. Built once, on first use. */
export function loadSearchIndex(): Promise<SearchIndex> {
  cached ??= Promise.all(INDOOR_BUILDING_IDS.map(loadIndoorBuilding)).then((bundles) =>
    buildSearchIndex(bundles.map((b) => b.building)),
  );
  return cached;
}
