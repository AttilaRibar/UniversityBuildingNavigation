import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import type { CampusBuilding, Faculty } from "@/domain/campus/model";
import buildingsJson from "./buildings.json";
import facultiesJson from "./faculties.json";

/** Footprints with `CampusBuilding` properties, ready to be used as a map source. */
export const campusGeoJson = buildingsJson as unknown as FeatureCollection<Polygon | MultiPolygon, CampusBuilding>;

export const campusBuildings: readonly CampusBuilding[] = campusGeoJson.features.map((f) => f.properties);

export const faculties: readonly Faculty[] = facultiesJson;

export const facultyByAbbr = (abbr: string): Faculty | undefined => faculties.find((f) => f.abbr === abbr);

export const campusBuildingById = (id: string): CampusBuilding | undefined => campusBuildings.find((b) => b.id === id);
