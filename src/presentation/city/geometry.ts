import type { MultiPolygon, Polygon, Position } from "geojson";

/** Metres per degree of latitude; good enough for building-sized offsets. */
const METRES_PER_DEGREE = 111_320;
/** Sharp corners would shoot far out when offset; cap the miter at this many offsets. */
const MITER_LIMIT = 3;

type Vec = readonly [number, number];

function signedArea(ring: readonly Vec[]): number {
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
}

/** Unit normal pointing to the right of the edge a→b. */
function rightNormal(a: Vec, b: Vec): Vec {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  return [dy / len, -dx / len];
}

/**
 * Moves every edge of a closed ring `distance` metres outwards from the
 * filled area (holes shrink), joining edges with clamped miters.
 */
function offsetRing(ring: readonly Position[], distance: number, isHole: boolean): Position[] {
  const first = ring[0];
  const last = ring[ring.length - 1];
  const open = first[0] === last[0] && first[1] === last[1] ? ring.slice(0, -1) : ring;
  if (open.length < 3) return [...ring];
  const lat0 = open[0][1];
  const lon0 = open[0][0];
  const kx = METRES_PER_DEGREE * Math.cos((lat0 * Math.PI) / 180);
  const local: Vec[] = open.map(([lon, lat]) => [(lon - lon0) * kx, (lat - lat0) * METRES_PER_DEGREE]);
  // The right normal points out of a counter-clockwise ring; flip for clockwise rings and for holes.
  const sign = (signedArea(local) > 0 ? 1 : -1) * (isHole ? -1 : 1);
  const n = local.length;
  const out: Position[] = local.map((p, i) => {
    const prev = local[(i - 1 + n) % n];
    const next = local[(i + 1) % n];
    const n1 = rightNormal(prev, p);
    const n2 = rightNormal(p, next);
    let mx = n1[0] + n2[0];
    let my = n1[1] + n2[1];
    const mLen = Math.hypot(mx, my);
    let scale = distance;
    if (mLen > 1e-6) {
      mx /= mLen;
      my /= mLen;
      scale = Math.min(distance / Math.max(mx * n1[0] + my * n1[1], 1e-6), distance * MITER_LIMIT);
    } else {
      [mx, my] = n1;
    }
    const x = p[0] + sign * mx * scale;
    const y = p[1] + sign * my * scale;
    return [lon0 + x / kx, lat0 + y / METRES_PER_DEGREE];
  });
  out.push(out[0]);
  return out;
}

/**
 * Grows a footprint by `distance` metres. Our coloured buildings are drawn a
 * hair wider than the grey base-map ones so the two never z-fight.
 */
export function inflatePolygon<T extends Polygon | MultiPolygon>(geometry: T, distance: number): T {
  const grow = (rings: Position[][]) => rings.map((ring, i) => offsetRing(ring, distance, i > 0));
  if (geometry.type === "Polygon") return { ...geometry, coordinates: grow(geometry.coordinates) };
  return { ...geometry, coordinates: (geometry as MultiPolygon).coordinates.map(grow) };
}

export type LngLatBox = [[number, number], [number, number]];

/** [[west, south], [east, north]] of every vertex of the given geometries. */
export function boundsOf(geometries: readonly (Polygon | MultiPolygon)[]): LngLatBox {
  let w = Infinity;
  let s = Infinity;
  let e = -Infinity;
  let n = -Infinity;
  for (const g of geometries) {
    const rings = g.type === "Polygon" ? g.coordinates : g.coordinates.flat();
    for (const [lon, lat] of rings.flat()) {
      w = Math.min(w, lon);
      e = Math.max(e, lon);
      s = Math.min(s, lat);
      n = Math.max(n, lat);
    }
  }
  return [
    [w, s],
    [e, n],
  ];
}

function parseHex(hex: string): [number, number, number] {
  const v = hex.replace("#", "");
  const full = v.length === 3 ? [...v].map((c) => c + c).join("") : v;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
}

/** Blue-grey of the base map that muted colours drift towards. */
const MAP_TINT = [192, 203, 218] as const;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * A quieter version of a colour: half desaturated, then pulled towards the
 * map's blue-grey. Used for the buildings that are not selected.
 */
export function muteColor(hex: string): string {
  const [r, g, b] = parseHex(hex);
  const grey = 0.3 * r + 0.59 * g + 0.11 * b;
  return `#${[r, g, b]
    .map((c, i) => Math.round(lerp(lerp(c, grey, 0.5), MAP_TINT[i], 0.45)))
    .map((c) => c.toString(16).padStart(2, "0"))
    .join("")}`;
}
