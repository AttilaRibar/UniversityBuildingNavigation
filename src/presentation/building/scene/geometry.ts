import * as THREE from "three";
import type { Polygon } from "@/domain/geometry/polygon";
import { centroid } from "@/domain/geometry/polygon";
import type { Vec2 } from "@/domain/geometry/vec2";

/**
 * Plan coordinates (x right, y up, metres) map to the scene as X = x, Z = -y,
 * with Y as height. Keeping this in one place avoids sign mistakes elsewhere.
 */
export const toScene = (p: Vec2, height = 0): THREE.Vector3 => new THREE.Vector3(p[0], height, -p[1]);

function shapeOf(polygon: Polygon): THREE.Shape {
  const shape = new THREE.Shape();
  polygon.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)));
  shape.closePath();
  return shape;
}

/** A prism standing on `base` with the polygon as its footprint. */
export function prism(polygon: Polygon, height: number, base = 0): THREE.BufferGeometry {
  const geometry = new THREE.ExtrudeGeometry(shapeOf(polygon), { depth: height, bevelEnabled: false });
  geometry.rotateX(-Math.PI / 2); // extrusion axis (+z) becomes up (+y); plan y becomes -z
  geometry.translate(0, base, 0);
  return geometry;
}

/** A flat polygon lying at `height`. */
export function flat(polygon: Polygon, height: number): THREE.BufferGeometry {
  const geometry = new THREE.ShapeGeometry(shapeOf(polygon));
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, height, 0);
  return geometry;
}

/** Pulls every vertex towards the centroid so neighbouring rooms read as separate blocks. */
export function shrink(polygon: Polygon, by: number): Polygon {
  const c = centroid(polygon);
  return polygon.map(([x, y]) => {
    const dx = c[0] - x;
    const dy = c[1] - y;
    const len = Math.hypot(dx, dy);
    const k = len > by * 4 ? by / len : 0;
    return [x + dx * k, y + dy * k] as Vec2;
  });
}

/**
 * A flat ribbon following a polyline, with round joints. Triangles are emitted
 * in path order so `setDrawRange` can reveal the ribbon progressively, and
 * `uv.x` carries the distance along the path for the moving chevron texture.
 */
export function ribbon(points: readonly Vec2[], width: number, height: number, uvScale: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const half = width / 2;
  let travelled = 0;

  const push = (p: Vec2, u: number, v: number) => {
    positions.push(p[0], height, -p[1]);
    uvs.push(u * uvScale, v);
  };
  const disc = (c: Vec2, u: number) => {
    const steps = 10;
    for (let i = 0; i < steps; i++) {
      const a0 = (i / steps) * Math.PI * 2;
      const a1 = ((i + 1) / steps) * Math.PI * 2;
      push(c, u, 0.5);
      push([c[0] + Math.cos(a1) * half, c[1] + Math.sin(a1) * half], u, 0.5);
      push([c[0] + Math.cos(a0) * half, c[1] + Math.sin(a0) * half], u, 0.5);
    }
  };

  if (points.length > 0) disc(points[0], 0);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 1e-6) continue;
    const nx = (-(b[1] - a[1]) / len) * half;
    const ny = ((b[0] - a[0]) / len) * half;
    const u0 = travelled;
    const u1 = travelled + len;
    const a0: Vec2 = [a[0] + nx, a[1] + ny];
    const a1: Vec2 = [a[0] - nx, a[1] - ny];
    const b0: Vec2 = [b[0] + nx, b[1] + ny];
    const b1: Vec2 = [b[0] - nx, b[1] - ny];
    push(a0, u0, 0); push(a1, u0, 1); push(b0, u1, 0);
    push(b0, u1, 0); push(a1, u0, 1); push(b1, u1, 1);
    travelled = u1;
    disc(b, u1);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}
