import type { Map as MapLibreMap } from "maplibre-gl";
import { campusFeatureIds, setCampusGrowth } from "./campusLayers";

const GROW_MS = 900;
const STAGGER_MS = 80;
const START_DELAY_MS = 250;

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/** Every university building flat on the ground, ready to grow. */
export function flattenCampusBuildings(map: MapLibreMap): void {
  setCampusGrowth(map, new Map(campusFeatureIds.map((id) => [id, 0])));
}

/**
 * University buildings rise from the ground one after another. Returns a
 * cancel function that also leaves every building at full height.
 */
export function growCampusBuildings(map: MapLibreMap): () => void {
  let frame = 0;
  const start = performance.now() + START_DELAY_MS;
  const tick = (now: number) => {
    const growth = new Map<string, number>();
    campusFeatureIds.forEach((id, i) => {
      const t = Math.min(Math.max((now - start - i * STAGGER_MS) / GROW_MS, 0), 1);
      growth.set(id, easeOutCubic(t));
    });
    setCampusGrowth(map, growth);
    const done = now - start >= GROW_MS + STAGGER_MS * (campusFeatureIds.length - 1);
    frame = done ? 0 : requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(frame);
    if (frame) setCampusGrowth(map, new Map(campusFeatureIds.map((id) => [id, 1])));
  };
}
