import type { Polygon } from "../geometry/polygon";
import type { Vec2 } from "../geometry/vec2";

/**
 * Indoor data model.
 *
 * Naming follows the IMDF vocabulary (level, unit, opening, amenity, anchor)
 * where a matching concept exists. IMDF has no path network, so `Walkway` and
 * `Connector` are our own additions. Geometry is in metres in a building-local
 * frame; `Georeference` ties that frame to WGS84.
 */

export type LocalizedText = Readonly<{ hu: string; en: string }>;

export type LevelId = string;

export interface Level {
  id: LevelId;
  /** Vertical order, 0 = lowest. Consecutive levels differ by exactly 1. */
  ordinal: number;
  /** Label printed on signs and floor switchers, e.g. "A", "F", "1". */
  shortName: string;
  name: LocalizedText;
  /** Floor elevation above the lowest level, metres. */
  elevation: number;
  /** Floor slab outlines used as the base of the level in the 3D view. */
  slabs: readonly Polygon[];
}

export type UnitCategory =
  | "lecture_hall"
  | "auditorium"
  | "conference"
  | "laboratory"
  | "office"
  | "restroom"
  | "restroom_accessible"
  | "cafe"
  | "reception"
  | "lobby"
  | "walkway"
  | "stairs"
  | "elevator"
  | "parking"
  | "outdoor"
  | "service";

/** Categories a student can search for and navigate to. */
export const DESTINATION_CATEGORIES: ReadonlySet<UnitCategory> = new Set<UnitCategory>([
  "lecture_hall",
  "auditorium",
  "conference",
  "laboratory",
  "office",
  "restroom",
  "restroom_accessible",
  "cafe",
  "reception",
  "lobby",
  "parking",
  "outdoor",
]);

/** A room or any other bounded space on a level. */
export interface Unit {
  id: string;
  levelId: LevelId;
  /** Room number as printed on the door, e.g. "F.06" or "1.32". */
  ref: string | null;
  name: LocalizedText | null;
  category: UnitCategory;
  polygon: Polygon;
  /** Organisational unit using the room, e.g. "NIK", "EKIK". */
  occupant: string | null;
  /** Extra search terms: nicknames, alternative spellings. */
  aliases: readonly string[];
  capacity: number | null;
  /** Shown as a route hint ("the café stays on your right"). */
  landmark: boolean;
  /**
   * `surveyed` geometry comes from plans or an on-site check; `estimated`
   * geometry was inferred from wayfinding signs and may be off by several metres.
   */
  accuracy: "surveyed" | "estimated";
}

/** A door: the point where a unit meets the walkway network. */
export interface Opening {
  id: string;
  levelId: LevelId;
  unitId: string;
  position: Vec2;
}

/** A centre line people can walk along. Walkways on a level form the routing network. */
export interface Walkway {
  id: string;
  levelId: LevelId;
  points: readonly Vec2[];
  /** False when the line includes steps (e.g. a few stairs in a corridor). */
  stepFree: boolean;
}

export type ConnectorKind = "stairs" | "elevator" | "ramp";

export interface ConnectorStop {
  levelId: LevelId;
  position: Vec2;
}

/** A vertical link between levels. Stops are ordered bottom to top. */
export interface Connector {
  id: string;
  kind: ConnectorKind;
  name: LocalizedText | null;
  stops: readonly ConnectorStop[];
}

/** A named place a route can start from: building entrances, QR anchor points. */
export interface Anchor {
  id: string;
  levelId: LevelId;
  position: Vec2;
  name: LocalizedText;
  kind: "entrance" | "waypoint";
  /** Exactly one anchor per building is the default route origin. */
  isDefault: boolean;
  /** Street the entrance opens to, when it is an entrance. */
  street: string | null;
}

export type AmenityCategory = "aed" | "information" | "smoking_area" | "seating";

export interface Amenity {
  id: string;
  levelId: LevelId;
  position: Vec2;
  category: AmenityCategory;
  name: LocalizedText;
}

export interface Georeference {
  /** WGS84 position of the local origin, [longitude, latitude]. */
  origin: readonly [number, number];
  /** Compass bearing of the local +x axis, degrees clockwise from north. */
  xAxisBearing: number;
}

export interface IndoorBuilding {
  id: string;
  name: LocalizedText;
  georeference: Georeference;
  levels: readonly Level[];
  units: readonly Unit[];
  openings: readonly Opening[];
  walkways: readonly Walkway[];
  connectors: readonly Connector[];
  anchors: readonly Anchor[];
  amenities: readonly Amenity[];
}

export function levelById(building: IndoorBuilding, id: LevelId): Level {
  const level = building.levels.find((l) => l.id === id);
  if (!level) throw new Error(`Unknown level "${id}" in building "${building.id}"`);
  return level;
}

export function defaultAnchor(building: IndoorBuilding): Anchor {
  const anchor = building.anchors.find((a) => a.isDefault) ?? building.anchors[0];
  if (!anchor) throw new Error(`Building "${building.id}" has no anchors`);
  return anchor;
}
