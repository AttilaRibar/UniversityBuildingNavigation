export interface BuildingLinkOptions {
  /** Destination unit id, e.g. "F.06". */
  to?: string;
  /** Origin: an anchor id or a unit id. Omitted = the building's default entrance. */
  from?: string;
  stepFree?: boolean;
}

/**
 * Shareable link to a building's indoor map, optionally with a destination.
 * Every room has a stable URL, so it can be put on a course page or a QR sign.
 */
export function buildingHref(buildingId: string, options: BuildingLinkOptions = {}): string {
  const params = new URLSearchParams();
  if (options.to) params.set("to", options.to);
  if (options.from) params.set("from", options.from);
  if (options.stepFree) params.set("sf", "1");
  const query = params.toString();
  return `/building/${encodeURIComponent(buildingId)}/${query ? `?${query}` : ""}`;
}
