/**
 * Minimal 2D vector helpers. All indoor geometry is expressed in metres in a
 * building-local frame (x to the right, y up when looking at the plan).
 */
export type Vec2 = readonly [x: number, y: number];

export const add = (a: Vec2, b: Vec2): Vec2 => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: Vec2, b: Vec2): Vec2 => [a[0] - b[0], a[1] - b[1]];
export const scale = (a: Vec2, k: number): Vec2 => [a[0] * k, a[1] * k];
export const dot = (a: Vec2, b: Vec2): number => a[0] * b[0] + a[1] * b[1];
/** z component of the 3D cross product; positive when `b` is counter-clockwise from `a`. */
export const cross = (a: Vec2, b: Vec2): number => a[0] * b[1] - a[1] * b[0];
export const length = (a: Vec2): number => Math.hypot(a[0], a[1]);
export const distance = (a: Vec2, b: Vec2): number => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const lerp = (a: Vec2, b: Vec2, t: number): Vec2 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];
export const equals = (a: Vec2, b: Vec2, eps = 1e-6): boolean =>
  Math.abs(a[0] - b[0]) <= eps && Math.abs(a[1] - b[1]) <= eps;

export function normalize(a: Vec2): Vec2 {
  const len = length(a);
  return len === 0 ? [0, 0] : [a[0] / len, a[1] / len];
}

/**
 * Signed angle in degrees to turn from direction `from` to direction `to`.
 * Positive = counter-clockwise = a LEFT turn in the local frame (y up).
 */
export function signedAngleDeg(from: Vec2, to: Vec2): number {
  return (Math.atan2(cross(from, to), dot(from, to)) * 180) / Math.PI;
}

/** Closest point to `p` on segment `a`–`b`, with its parameter t in [0, 1]. */
export function projectOnSegment(p: Vec2, a: Vec2, b: Vec2): { point: Vec2; t: number; distance: number } {
  const ab = sub(b, a);
  const lenSq = dot(ab, ab);
  const t = lenSq === 0 ? 0 : Math.min(1, Math.max(0, dot(sub(p, a), ab) / lenSq));
  const point = lerp(a, b, t);
  return { point, t, distance: distance(p, point) };
}

/** Proper or touching intersection of segments `a1`–`a2` and `b1`–`b2`, if any. */
export function segmentIntersection(a1: Vec2, a2: Vec2, b1: Vec2, b2: Vec2, eps = 1e-9): Vec2 | null {
  const r = sub(a2, a1);
  const s = sub(b2, b1);
  const denom = cross(r, s);
  if (Math.abs(denom) < eps) return null; // parallel or collinear: handled by shared vertices
  const qp = sub(b1, a1);
  const t = cross(qp, s) / denom;
  const u = cross(qp, r) / denom;
  if (t < -eps || t > 1 + eps || u < -eps || u > 1 + eps) return null;
  return lerp(a1, a2, Math.min(1, Math.max(0, t)));
}

export function polylineLength(points: readonly Vec2[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += distance(points[i - 1], points[i]);
  return total;
}
