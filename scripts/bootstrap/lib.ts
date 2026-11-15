/**
 * Tiny authoring toolkit used by the bootstrap scripts to produce the first
 * version of a building's GeoJSON from wayfinding signs.
 *
 * The committed GeoJSON under `src/data/buildings/` is the source of truth.
 * These scripts only exist so the initial derivation stays reproducible; once
 * a level has been corrected by hand (or replaced with surveyed plans), do not
 * re-run the bootstrap for it.
 */
import type { Feature, FeatureCollection, LineString, Point, Polygon } from "geojson";

export type P = [number, number];
export type Text = { hu: string; en: string };

const round = (n: number) => Math.round(n * 100) / 100;
const rp = (p: P): P => [round(p[0]), round(p[1])];

/** A rotated authoring frame: lets a wing be drawn axis-aligned and placed at its real angle. */
export interface Frame {
  pt(x: number, y: number): P;
  rect(x0: number, y0: number, x1: number, y1: number): P[];
  poly(points: P[]): P[];
  /** Annular sector around `center` (frame coords), angles in degrees, counter-clockwise. */
  sector(center: P, rInner: number, rOuter: number, from: number, to: number): P[];
  polar(center: P, r: number, angle: number): P;
}

export function frame(origin: P, angleDeg: number): Frame {
  const a = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const pt = (x: number, y: number): P => rp([origin[0] + x * cos - y * sin, origin[1] + x * sin + y * cos]);
  const polar = (c: P, r: number, angle: number): P => {
    const t = (angle * Math.PI) / 180;
    return pt(c[0] + r * Math.cos(t), c[1] + r * Math.sin(t));
  };
  return {
    pt,
    polar,
    rect: (x0, y0, x1, y1) => [pt(x0, y0), pt(x1, y0), pt(x1, y1), pt(x0, y1)],
    poly: (points) => points.map(([x, y]) => pt(x, y)),
    sector: (c, rInner, rOuter, from, to) => {
      const steps = Math.max(2, Math.ceil(Math.abs(to - from) / 10));
      const outer: P[] = [];
      const inner: P[] = [];
      for (let i = 0; i <= steps; i++) {
        const angle = from + ((to - from) * i) / steps;
        outer.push(polar(c, rOuter, angle));
        if (rInner > 0) inner.unshift(polar(c, rInner, angle));
      }
      return rInner > 0 ? [...outer, ...inner] : [pt(c[0], c[1]), ...outer];
    },
  };
}

export interface UnitInput {
  id?: string;
  ref?: string;
  name?: Text;
  category: string;
  occupant?: string;
  aliases?: string[];
  capacity?: number;
  landmark?: boolean;
  accuracy?: "surveyed" | "estimated";
}

export class LevelBuilder {
  private readonly features: Feature[] = [];
  private readonly ids = new Set<string>();

  constructor(readonly levelId: string) {}

  private uniqueId(base: string): string {
    let id = base;
    for (let n = 2; this.ids.has(id); n++) id = `${base}-${n}`;
    this.ids.add(id);
    return id;
  }

  private polygon(ring: P[], properties: Record<string, unknown>): void {
    const closed = [...ring, ring[0]];
    const geometry: Polygon = { type: "Polygon", coordinates: [closed] };
    this.features.push({ type: "Feature", properties, geometry });
  }

  private point(position: P, properties: Record<string, unknown>): void {
    const geometry: Point = { type: "Point", coordinates: position };
    this.features.push({ type: "Feature", properties, geometry });
  }

  slab(ring: P[]): this {
    this.polygon(ring, { feature_type: "level" });
    return this;
  }

  /** Adds a unit and its doors; returns the unit id. */
  unit(input: UnitInput, ring: P[], doors: P[] = []): string {
    const slug = input.id ?? input.ref ?? input.category;
    const id = this.uniqueId(input.ref ? `${input.ref}` : `${this.levelId}-${slug}`);
    this.polygon(ring, {
      feature_type: "unit",
      id,
      ref: input.ref ?? null,
      name: input.name ?? null,
      category: input.category,
      occupant: input.occupant ?? null,
      aliases: input.aliases ?? [],
      capacity: input.capacity ?? null,
      landmark: input.landmark ?? false,
      accuracy: input.accuracy ?? "estimated",
    });
    doors.forEach((door, i) => {
      this.point(door, { feature_type: "opening", id: `${id}/door${doors.length > 1 ? i + 1 : ""}`, unit_id: id });
    });
    return id;
  }

  walkway(points: P[], stepFree = true): this {
    const id = this.uniqueId(`${this.levelId}-walkway`);
    const geometry: LineString = { type: "LineString", coordinates: points };
    this.features.push({ type: "Feature", properties: { feature_type: "walkway", id, step_free: stepFree }, geometry });
    return this;
  }

  /** One stop of a vertical connector; stops sharing a `connectorId` across levels form the connector. */
  connector(connectorId: string, kind: "stairs" | "elevator" | "ramp", position: P, name: Text): this {
    this.point(position, { feature_type: "connector", connector_id: connectorId, kind, name });
    return this;
  }

  anchor(id: string, position: P, props: { name: Text; kind: "entrance" | "waypoint"; isDefault?: boolean; street?: string }): this {
    this.point(position, {
      feature_type: "anchor",
      id,
      name: props.name,
      kind: props.kind,
      is_default: props.isDefault ?? false,
      street: props.street ?? null,
    });
    return this;
  }

  amenity(id: string, category: string, position: P, name: Text): this {
    this.point(position, { feature_type: "amenity", id, category, name });
    return this;
  }

  toGeoJSON(): FeatureCollection {
    return { type: "FeatureCollection", features: this.features };
  }
}

/** Splits `[x0, x1]` into `count` equal spans. */
export function spans(x0: number, x1: number, count: number): Array<[number, number]> {
  const w = (x1 - x0) / count;
  return Array.from({ length: count }, (_, i) => [x0 + i * w, x0 + (i + 1) * w] as [number, number]);
}

/** Room numbers `prefix.from` … `prefix.to`, zero padded to two digits. */
export function refs(prefix: string, from: number, to: number): string[] {
  return Array.from({ length: to - from + 1 }, (_, i) => `${prefix}.${String(from + i).padStart(2, "0")}`);
}

/**
 * Lays numbered rooms out on both sides of a corridor, alternating sides so a
 * room's position along the corridor grows with its number. `back` rooms get
 * the 1st, 3rd, … number.
 */
export function zigzag<T>(items: T[]): { back: T[]; front: T[] } {
  return {
    back: items.filter((_, i) => i % 2 === 0),
    front: items.filter((_, i) => i % 2 === 1),
  };
}
