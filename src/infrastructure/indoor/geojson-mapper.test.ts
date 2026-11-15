import type { FeatureCollection } from "geojson";
import { describe, expect, it } from "vitest";
import { mapBuilding, type BuildingManifest } from "./geojson-mapper";

const manifest: BuildingManifest = {
  id: "t",
  code: "T",
  name: { hu: "Teszt", en: "Test" },
  georeference: { origin: [19, 47.5], xAxisBearing: 90 },
  levels: [
    { id: "1", ordinal: 1, shortName: "1", name: { hu: "1. emelet", en: "1st floor" }, elevation: 4 },
    { id: "F", ordinal: 0, shortName: "F", name: { hu: "Földszint", en: "Ground floor" }, elevation: 0 },
  ],
  attribution: "test",
};

const square = [[[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]]];
const level = (features: FeatureCollection["features"]): FeatureCollection => ({ type: "FeatureCollection", features });
const point = (coordinates: number[], properties: Record<string, unknown>) => ({ type: "Feature" as const, properties, geometry: { type: "Point" as const, coordinates } });

const files = {
  F: level([
    { type: "Feature", properties: { feature_type: "level" }, geometry: { type: "Polygon", coordinates: square } },
    { type: "Feature", properties: { feature_type: "unit", id: "F.01", ref: "F.01", category: "lecture_hall", capacity: 40 }, geometry: { type: "Polygon", coordinates: square } },
    point([2, 0], { feature_type: "opening", id: "F.01/door", unit_id: "F.01" }),
    { type: "Feature", properties: { feature_type: "walkway", id: "w", step_free: false }, geometry: { type: "LineString", coordinates: [[0, -1], [4, -1]] } },
    point([4, -1], { feature_type: "connector", connector_id: "lift", kind: "elevator", name: { hu: "Lift", en: "Lift" } }),
    point([0, -1], { feature_type: "anchor", id: "door", name: { hu: "Bejárat", en: "Entrance" }, kind: "entrance", is_default: true, street: "Fő utca" }),
  ]),
  "1": level([point([4, -1], { feature_type: "connector", connector_id: "lift", kind: "elevator", name: null })]),
};

describe("mapBuilding", () => {
  const building = mapBuilding(manifest, files);

  it("orders levels bottom to top and attaches their slabs", () => {
    expect(building.levels.map((l) => l.id)).toEqual(["F", "1"]);
    expect(building.levels[0].slabs).toHaveLength(1);
  });

  it("opens GeoJSON rings and fills unit defaults", () => {
    const unit = building.units[0];
    expect(unit.polygon).toHaveLength(4);
    expect(unit).toMatchObject({ ref: "F.01", capacity: 40, accuracy: "estimated", landmark: false, aliases: [], occupant: null });
  });

  it("groups connector stops across levels in bottom-to-top order", () => {
    expect(building.connectors).toHaveLength(1);
    expect(building.connectors[0].stops.map((s) => s.levelId)).toEqual(["F", "1"]);
  });

  it("maps openings, walkways and anchors", () => {
    expect(building.openings[0]).toMatchObject({ unitId: "F.01", levelId: "F" });
    expect(building.walkways[0].stepFree).toBe(false);
    expect(building.anchors[0]).toMatchObject({ isDefault: true, kind: "entrance", street: "Fő utca" });
  });

  it("rejects unknown feature types and missing level files", () => {
    expect(() => mapBuilding(manifest, { ...files, F: level([point([0, 0], { feature_type: "nope" })]) })).toThrow(/Unknown feature_type/);
    expect(() => mapBuilding(manifest, { F: files.F })).toThrow(/No level file/);
  });
});
