import type { Feature, FeatureCollection, LineString, Point, Polygon as GeoPolygon } from "geojson";
import type { Polygon } from "@/domain/geometry/polygon";
import type { Vec2 } from "@/domain/geometry/vec2";
import type {
  Amenity,
  Anchor,
  Connector,
  ConnectorKind,
  ConnectorStop,
  Georeference,
  IndoorBuilding,
  Level,
  LocalizedText,
  Opening,
  Unit,
  Walkway,
} from "@/domain/indoor/model";

/** Shape of `building.json`, the per-building manifest next to the level files. */
export interface BuildingManifest {
  id: string;
  code: string;
  name: LocalizedText;
  georeference: { origin: number[]; xAxisBearing: number };
  levels: Array<{ id: string; ordinal: number; shortName: string; name: LocalizedText; elevation: number }>;
  attribution: string;
}

type Props = Record<string, unknown>;

const vec = (c: number[]): Vec2 => [c[0], c[1]];
/** GeoJSON rings repeat the first vertex at the end; the domain uses open rings. */
const ring = (g: GeoPolygon): Polygon => g.coordinates[0].slice(0, -1).map(vec);

function expect<T>(value: unknown, what: string, featureId: string): T {
  if (value === undefined || value === null) throw new Error(`Feature "${featureId}" is missing ${what}`);
  return value as T;
}

/**
 * Turns the per-level GeoJSON source files into the domain model.
 * This is the only place that knows about the on-disk format.
 */
export function mapBuilding(manifest: BuildingManifest, levelFiles: Record<string, FeatureCollection>): IndoorBuilding {
  const levels: Level[] = [];
  const units: Unit[] = [];
  const openings: Opening[] = [];
  const walkways: Walkway[] = [];
  const anchors: Anchor[] = [];
  const amenities: Amenity[] = [];
  const stops = new Map<string, { kind: ConnectorKind; name: LocalizedText | null; stops: Array<ConnectorStop & { ordinal: number }> }>();

  for (const meta of [...manifest.levels].sort((a, b) => a.ordinal - b.ordinal)) {
    const file = levelFiles[meta.id];
    if (!file) throw new Error(`No level file for level "${meta.id}" of building "${manifest.id}"`);
    const slabs: Polygon[] = [];

    for (const feature of file.features as Feature[]) {
      const p = (feature.properties ?? {}) as Props;
      const id = String(p.id ?? p.connector_id ?? p.feature_type);
      switch (p.feature_type) {
        case "level":
          slabs.push(ring(feature.geometry as GeoPolygon));
          break;
        case "unit":
          units.push({
            id,
            levelId: meta.id,
            ref: (p.ref as string | null) ?? null,
            name: (p.name as LocalizedText | null) ?? null,
            category: expect(p.category, "category", id),
            polygon: ring(feature.geometry as GeoPolygon),
            occupant: (p.occupant as string | null) ?? null,
            aliases: (p.aliases as string[] | undefined) ?? [],
            capacity: (p.capacity as number | null) ?? null,
            landmark: p.landmark === true,
            accuracy: p.accuracy === "surveyed" ? "surveyed" : "estimated",
          });
          break;
        case "opening":
          openings.push({
            id,
            levelId: meta.id,
            unitId: expect(p.unit_id, "unit_id", id),
            position: vec((feature.geometry as Point).coordinates),
          });
          break;
        case "walkway":
          walkways.push({
            id,
            levelId: meta.id,
            points: (feature.geometry as LineString).coordinates.map(vec),
            stepFree: p.step_free !== false,
          });
          break;
        case "connector": {
          const connectorId = expect<string>(p.connector_id, "connector_id", id);
          const entry = stops.get(connectorId) ?? { kind: expect<ConnectorKind>(p.kind, "kind", id), name: (p.name as LocalizedText | null) ?? null, stops: [] };
          entry.stops.push({ levelId: meta.id, position: vec((feature.geometry as Point).coordinates), ordinal: meta.ordinal });
          stops.set(connectorId, entry);
          break;
        }
        case "anchor":
          anchors.push({
            id,
            levelId: meta.id,
            position: vec((feature.geometry as Point).coordinates),
            name: expect(p.name, "name", id),
            kind: p.kind === "waypoint" ? "waypoint" : "entrance",
            isDefault: p.is_default === true,
            street: (p.street as string | null) ?? null,
          });
          break;
        case "amenity":
          amenities.push({
            id,
            levelId: meta.id,
            position: vec((feature.geometry as Point).coordinates),
            category: expect(p.category, "category", id),
            name: expect(p.name, "name", id),
          });
          break;
        default:
          throw new Error(`Unknown feature_type "${String(p.feature_type)}" on level "${meta.id}"`);
      }
    }
    levels.push({ ...meta, slabs });
  }

  const connectors: Connector[] = [...stops.entries()].map(([id, c]) => ({
    id,
    kind: c.kind,
    name: c.name,
    stops: [...c.stops].sort((a, b) => a.ordinal - b.ordinal).map(({ levelId, position }) => ({ levelId, position })),
  }));

  const georeference: Georeference = {
    origin: [manifest.georeference.origin[0], manifest.georeference.origin[1]],
    xAxisBearing: manifest.georeference.xAxisBearing,
  };

  return { id: manifest.id, name: manifest.name, georeference, levels, units, openings, walkways, connectors, anchors, amenities };
}
