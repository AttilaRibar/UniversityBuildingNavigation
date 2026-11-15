import type { LngLatBox } from "./geometry";

/**
 * The overview is a fixed-angle 3D view: users pan and zoom, but pitch and
 * bearing stay put so the city always reads the same way.
 */
export const CAMERA = {
  pitch: 55,
  bearing: -17,
  minZoom: 10.5,
  maxZoom: 18.5,
} as const;

/** Budapest with some margin; panning stops here. */
export const BUDAPEST_BOUNDS: LngLatBox = [
  [18.86, 47.33],
  [19.38, 47.64],
];

/** From this zoom each building gets its own label instead of one per campus. */
export const BUILDING_LABEL_ZOOM = 14.6;

/** Zoom used when a building is selected (unless the user is already closer). */
export const FOCUS_ZOOM = 16.9;

/** Closest zoom when fitting a campus, so a one-building campus keeps some context. */
export const CAMPUS_MAX_ZOOM = 17.2;

/** Breathing room around the subject on top of whatever overlays cover. */
export const VIEW_MARGIN = { top: 72, side: 28, bottom: 28 } as const;

/** A sheet may cover most of the screen; the camera never plans for more than this share. */
export const MAX_OBSCURED_SHARE = 0.6;
