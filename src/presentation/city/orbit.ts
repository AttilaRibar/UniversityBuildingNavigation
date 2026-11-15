import type { Map as MapLibreMap } from "maplibre-gl";

/** A full turn takes a minute: slow enough to read the labels, fast enough to notice. */
export const ORBIT_DEG_PER_SECOND = 6;

export interface MapOrbit {
  /** Starts turning (no-op while already turning). */
  start(): void;
  stop(): void;
  destroy(): void;
}

/**
 * Slowly turns the map around its (padded) centre, like a turntable.
 *
 * The orbit pauses by itself while the camera is animated or dragged, so
 * `flyTo` and friends keep working; any touch, click, wheel or key on the map
 * stops it for good until `start` is called again.
 */
export function createMapOrbit(map: MapLibreMap, degPerSecond = ORBIT_DEG_PER_SECOND): MapOrbit {
  let frame = 0;
  let last = 0;

  const tick = (now: number) => {
    frame = requestAnimationFrame(tick);
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    // Never fight the user or a camera animation; just wait for them to finish.
    if (document.hidden || map.isMoving()) return;
    map.jumpTo({ bearing: map.getBearing() + dt * degPerSecond });
  };

  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
  };

  const container = map.getContainer();
  const options = { capture: true, passive: true } as const;
  for (const type of ["pointerdown", "wheel", "keydown"] as const) container.addEventListener(type, stop, options);

  return {
    start() {
      if (frame) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    },
    stop,
    destroy() {
      stop();
      for (const type of ["pointerdown", "wheel", "keydown"] as const) container.removeEventListener(type, stop, options);
    },
  };
}
