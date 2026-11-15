import { describe, expect, it } from "vitest";
import type { Georeference } from "../indoor/model";
import { bearingBetween, localToLngLat } from "./georef";

const M_PER_DEG_LAT = 111_132;

/** Simple equirectangular distance in metres between two [lng, lat] points. */
function metresBetween(a: readonly [number, number], b: readonly [number, number]): number {
  const lat = (((a[1] + b[1]) / 2) * Math.PI) / 180;
  const dx = (b[0] - a[0]) * 111_320 * Math.cos(lat);
  const dy = (b[1] - a[1]) * M_PER_DEG_LAT;
  return Math.hypot(dx, dy);
}

const northFacing: Georeference = { origin: [19.03, 47.53], xAxisBearing: 0 };

describe("localToLngLat", () => {
  it("maps the local origin exactly to the georeference origin", () => {
    expect(localToLngLat(northFacing, [0, 0])).toEqual([19.03, 47.53]);
  });

  it("sends +x north and +y west when the x axis bears 0", () => {
    const [lonX, latX] = localToLngLat(northFacing, [100, 0]);
    expect(latX).toBeGreaterThan(47.53);
    expect(lonX).toBeCloseTo(19.03, 9);

    const [lonY, latY] = localToLngLat(northFacing, [0, 100]);
    expect(lonY).toBeLessThan(19.03);
    expect(latY).toBeCloseTo(47.53, 9);
  });

  it("sends +x east when the x axis bears 90", () => {
    const [lon, lat] = localToLngLat({ origin: [19.03, 47.53], xAxisBearing: 90 }, [100, 0]);
    expect(lon).toBeGreaterThan(19.03);
    expect(lat).toBeCloseTo(47.53, 9);
  });

  it("places the BA main entrance within 3 m of its surveyed position", () => {
    const ba: Georeference = { origin: [19.0340468, 47.5336501], xAxisBearing: 304.51 };
    const p = localToLngLat(ba, [-25.15, -52.64]);
    expect(metresBetween(p, [19.034719, 47.533912])).toBeLessThan(3);
  });

  it("preserves distances", () => {
    const ba: Georeference = { origin: [19.0340468, 47.5336501], xAxisBearing: 304.51 };
    const a: [number, number] = [-25.15, -52.64];
    const b: [number, number] = [60, 35];
    const local = Math.hypot(a[0] - b[0], a[1] - b[1]);
    const geo = metresBetween(localToLngLat(ba, a), localToLngLat(ba, b));
    expect(Math.abs(geo - local) / local).toBeLessThan(0.005);
  });
});

describe("bearingBetween", () => {
  const c: [number, number] = [19, 47];
  it("returns compass bearings for the four cardinal directions", () => {
    expect(bearingBetween(c, [19, 47.01])).toBeCloseTo(0, 6);
    expect(bearingBetween(c, [19.01, 47])).toBeCloseTo(90, 6);
    expect(bearingBetween(c, [19, 46.99])).toBeCloseTo(180, 6);
    expect(bearingBetween(c, [18.99, 47])).toBeCloseTo(270, 6);
  });

  it("always returns a value in [0, 360)", () => {
    for (const to of [[19.01, 47.01], [18.99, 47.01], [18.99, 46.99], [19.01, 46.99], [19, 47.01], [18.99, 47]] as const) {
      const b = bearingBetween(c, to);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThan(360);
    }
  });
});
