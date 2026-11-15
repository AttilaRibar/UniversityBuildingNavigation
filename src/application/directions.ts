/**
 * Hands walking directions to a building over to the phone's own maps app.
 * Outdoor routing is deliberately not ours: Google and Apple do it better.
 */
export type MapsPlatform = "apple" | "google";

/** Apple devices open Apple Maps; everything else gets the universal Google Maps link. */
export function detectMapsPlatform(userAgent: string, maxTouchPoints = 0): MapsPlatform {
  const isIPadOs = /Macintosh/.test(userAgent) && maxTouchPoints > 1;
  return /iPhone|iPad|iPod/.test(userAgent) || isIPadOs ? "apple" : "google";
}

export interface DirectionsTarget {
  /** WGS84 [longitude, latitude]. */
  location: readonly [number, number];
  label: string;
}

/**
 * A link that opens turn-by-turn directions from the user's current position.
 * Both URL schemes are documented, key-less, and open the native app when installed.
 */
export function buildDirectionsUrl(target: DirectionsTarget, platform: MapsPlatform): string {
  const [lon, lat] = target.location;
  if (platform === "apple") {
    const params = new URLSearchParams({ daddr: `${lat},${lon}`, dirflg: "w", q: target.label });
    return `https://maps.apple.com/?${params.toString()}`;
  }
  const params = new URLSearchParams({ api: "1", destination: `${lat},${lon}`, travelmode: "walking" });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
