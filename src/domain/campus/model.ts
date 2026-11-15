import type { LocalizedText } from "../indoor/model";

/** A faculty or other organisational unit that occupies campus buildings. */
export interface Faculty {
  /** Common abbreviation, e.g. "NIK". Used as the id. */
  abbr: string;
  name: LocalizedText;
  url: string | null;
  /** Colour of the faculty's buildings on the city map. */
  color: string;
}

export type CampusBuildingKind = "faculty" | "dormitory" | "sports";

/** A university building as shown on the city overview map. */
export interface CampusBuilding {
  id: string;
  /** Timetable code, e.g. "BA"; null when the building has none. */
  code: string | null;
  name: LocalizedText;
  /** One line saying what the building is, e.g. "Bécsi út main building". */
  description: LocalizedText;
  kind: CampusBuildingKind;
  /** The site the building belongs to; buildings of a campus are grouped on the map and in lists. */
  campus: { id: string; name: LocalizedText };
  /** Abbreviations of the faculties housed here. */
  faculties: readonly string[];
  address: string;
  district: string;
  /** WGS84 [longitude, latitude] of the building centre. */
  location: readonly [number, number];
  /** Extrusion height on the map, metres. */
  height: number;
  /** Colour on the map: the first faculty's colour, or a neutral one. */
  color: string;
  /** False when the footprint could not be confirmed against an official source. */
  verified: boolean;
  /** True when indoor navigation data exists for this building. */
  hasIndoorMap: boolean;
}
