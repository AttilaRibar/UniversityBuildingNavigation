import type { MultiPolygon, Polygon } from "geojson";
import type { CampusBuilding } from "@/domain/campus/model";
import type { LocalizedText } from "@/domain/indoor/model";
import { campusBuildings, campusGeoJson } from "@/data/campus";
import { boundsOf, type LngLatBox } from "./geometry";

/** A site of the university: the unit of the overview labels and of the building list. */
export interface CampusGroup {
  id: string;
  name: LocalizedText;
  buildings: readonly CampusBuilding[];
  /** Where the campus label stands: the middle of its buildings. */
  center: [number, number];
}

const footprintById = new Map<string, Polygon | MultiPolygon>(campusGeoJson.features.map((f) => [f.properties.id, f.geometry]));

/** Bounding box of the footprints of the given buildings. */
export function buildingBounds(buildingIds: readonly string[]): LngLatBox {
  return boundsOf(buildingIds.flatMap((id) => footprintById.get(id) ?? []));
}

function groupByCampus(buildings: readonly CampusBuilding[]): CampusGroup[] {
  const groups = new Map<string, CampusBuilding[]>();
  for (const b of buildings) {
    const list = groups.get(b.campus.id) ?? [];
    list.push(b);
    groups.set(b.campus.id, list);
  }
  return [...groups.values()].map((list) => {
    const [[w, s], [e, n]] = buildingBounds(list.map((b) => b.id));
    return { id: list[0].campus.id, name: list[0].campus.name, buildings: list, center: [(w + e) / 2, (s + n) / 2] };
  });
}

/** Campuses in data order (the main campus first), each with its buildings. */
export const campusGroups: readonly CampusGroup[] = groupByCampus(campusBuildings);

/** Everything the overview has to show at once. */
export const allBuildingsBounds: LngLatBox = buildingBounds(campusBuildings.map((b) => b.id));

/** Short label of a building on the map: its timetable code, or its name when it has none. */
export function buildingShortLabel(building: CampusBuilding, text: (v: LocalizedText) => string): string {
  return building.code ?? text(building.name);
}
