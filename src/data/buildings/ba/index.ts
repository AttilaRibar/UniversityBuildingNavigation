import type { FeatureCollection } from "geojson";
import { mapBuilding, type BuildingManifest } from "@/infrastructure/indoor/geojson-mapper";
import manifest from "./building.json";
import level1 from "./levels/1.json";
import level2 from "./levels/2.json";
import level3 from "./levels/3.json";
import level4 from "./levels/4.json";
import levelA from "./levels/A.json";
import levelF from "./levels/F.json";

const levels = { A: levelA, F: levelF, "1": level1, "2": level2, "3": level3, "4": level4 } as unknown as Record<string, FeatureCollection>;

/** Building BA (Bécsi út 96/B), assembled from its per-level GeoJSON. */
export const building = mapBuilding(manifest as BuildingManifest, levels);
export const code = manifest.code;
export const attribution = manifest.attribution;
