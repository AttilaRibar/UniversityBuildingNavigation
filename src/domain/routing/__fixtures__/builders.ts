import type { Polygon } from "../../geometry/polygon";
import type { Vec2 } from "../../geometry/vec2";
import type { Anchor, IndoorBuilding, Level, Opening, Unit, UnitCategory, Walkway } from "../../indoor/model";

/** Axis-aligned rectangle as a counter-clockwise ring. */
export function rect(minX: number, minY: number, maxX: number, maxY: number): Polygon {
  return [
    [minX, minY],
    [maxX, minY],
    [maxX, maxY],
    [minX, maxY],
  ];
}

export function level(id: string, ordinal: number, shortName: string): Level {
  return { id, ordinal, shortName, name: { hu: shortName, en: shortName }, elevation: ordinal * 4, slabs: [] };
}

export function unit(
  id: string,
  levelId: string,
  polygon: Polygon,
  options: { category?: UnitCategory; landmark?: boolean } = {},
): Unit {
  return {
    id,
    levelId,
    ref: id,
    name: { hu: id, en: id },
    category: options.category ?? "office",
    polygon,
    occupant: null,
    aliases: [],
    capacity: null,
    landmark: options.landmark ?? false,
    accuracy: "surveyed",
  };
}

export function opening(id: string, levelId: string, unitId: string, position: Vec2): Opening {
  return { id, levelId, unitId, position };
}

export function walkway(id: string, levelId: string, points: readonly Vec2[], stepFree = true): Walkway {
  return { id, levelId, points, stepFree };
}

export function anchor(id: string, levelId: string, position: Vec2, isDefault = false): Anchor {
  return {
    id,
    levelId,
    position,
    name: { hu: id, en: id },
    kind: isDefault ? "entrance" : "waypoint",
    isDefault,
    street: null,
  };
}

/** A building with sensible empty defaults, for small hand-built test cases. */
export function makeBuilding(parts: Partial<IndoorBuilding>): IndoorBuilding {
  return {
    id: "test",
    name: { hu: "Teszt", en: "Test" },
    georeference: { origin: [19.0, 47.5], xAxisBearing: 0 },
    levels: [level("L0", 0, "F")],
    units: [],
    openings: [],
    walkways: [],
    connectors: [],
    anchors: [],
    amenities: [],
    ...parts,
  };
}
