import { distance, projectOnSegment, signedAngleDeg, sub, type Vec2 } from "../geometry/vec2";

/** Points closer than this are treated as duplicates, metres. */
const DUPLICATE_EPSILON = 1e-3;

/**
 * Removes duplicate points and interior points where the polyline continues
 * within `angleToleranceDeg` of straight on. Direction reversals are kept.
 */
export function simplifyPolyline(points: readonly Vec2[], angleToleranceDeg = 1): Vec2[] {
  const deduped: Vec2[] = [];
  for (const p of points) {
    const last = deduped[deduped.length - 1];
    if (!last || distance(last, p) > DUPLICATE_EPSILON) deduped.push(p);
  }
  const result: Vec2[] = [];
  for (let i = 0; i < deduped.length; i++) {
    const next = deduped[i + 1];
    const prev = result[result.length - 1];
    if (prev && next && Math.abs(signedAngleDeg(sub(deduped[i], prev), sub(next, deduped[i]))) < angleToleranceDeg) {
      continue;
    }
    result.push(deduped[i]);
  }
  return result;
}

export interface PolylineProjection {
  point: Vec2;
  distance: number;
  /** Index of the segment (points[i]–points[i+1]) holding the closest point. */
  segmentIndex: number;
}

/** Closest point to `p` on a polyline of at least two points; the first segment wins ties. */
export function projectOnPolyline(points: readonly Vec2[], p: Vec2): PolylineProjection | null {
  let best: PolylineProjection | null = null;
  for (let i = 0; i + 1 < points.length; i++) {
    const projection = projectOnSegment(p, points[i], points[i + 1]);
    if (!best || projection.distance < best.distance) {
      best = { point: projection.point, distance: projection.distance, segmentIndex: i };
    }
  }
  return best;
}
