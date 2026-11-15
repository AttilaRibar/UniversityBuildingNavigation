import type { Georeference } from "../indoor/model";
import type { Vec2 } from "./vec2";

/** Metres per degree of latitude; good to well under a metre at building scale. */
const METRES_PER_DEGREE_LAT = 111_132;
const METRES_PER_DEGREE_LON_AT_EQUATOR = 111_320;

/**
 * Turns a building-local point (metres, right-handed: +y is 90° counter-clockwise
 * from +x) into WGS84 `[longitude, latitude]`. A flat-earth approximation, which is
 * exact enough over the few hundred metres of a building.
 */
export function localToLngLat(georef: Georeference, p: Vec2): [number, number] {
  const bx = (georef.xAxisBearing * Math.PI) / 180;
  const by = bx - Math.PI / 2;
  const east = p[0] * Math.sin(bx) + p[1] * Math.sin(by);
  const north = p[0] * Math.cos(bx) + p[1] * Math.cos(by);
  const [lon0, lat0] = georef.origin;
  return [
    lon0 + east / (METRES_PER_DEGREE_LON_AT_EQUATOR * Math.cos((lat0 * Math.PI) / 180)),
    lat0 + north / METRES_PER_DEGREE_LAT,
  ];
}

/** Compass bearing in degrees (clockwise from north, 0..360) from one WGS84 point towards another. */
export function bearingBetween(from: readonly [number, number], to: readonly [number, number]): number {
  const east = (to[0] - from[0]) * Math.cos((from[1] * Math.PI) / 180);
  const north = to[1] - from[1];
  return ((Math.atan2(east, north) * 180) / Math.PI + 360) % 360;
}
