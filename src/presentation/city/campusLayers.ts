import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import type { Map as MapLibreMap } from "maplibre-gl";
import { campusGeoJson } from "@/data/campus";
import { inflatePolygon, muteColor } from "./geometry";

export const CAMPUS_SOURCE = "campus";
export const CAMPUS_LAYER = "campus-3d";
const HALO_LAYER = "campus-halo";

/** Enough to stay clear of the grey base-map footprint underneath, too little to notice. */
const INFLATE_METRES = 0.6;
const ACCENT = "#ffd21f";

interface CampusFeatureProps {
  id: string;
  color: string;
  mutedColor: string;
  height: number;
}

/** Only what the map paints, so the GeoJSON worker has little to serialise. */
const campusMapData: FeatureCollection<Polygon | MultiPolygon, CampusFeatureProps> = {
  type: "FeatureCollection",
  features: campusGeoJson.features.map(
    (f): Feature<Polygon | MultiPolygon, CampusFeatureProps> => ({
      type: "Feature",
      geometry: inflatePolygon(f.geometry, INFLATE_METRES),
      properties: {
        id: f.properties.id,
        color: f.properties.color,
        mutedColor: muteColor(f.properties.color),
        height: f.properties.height,
      },
    }),
  ),
};

/**
 * Vector-tile ids of the base-map copies of our buildings. OpenMapTiles
 * (Planetiler) encodes an OSM element as `id * 10 + 2` for ways and `+ 3` for
 * relations; hiding those keeps the grey block from poking through the
 * coloured one when OSM's height is larger than ours.
 */
export const baseMapCopiesOfCampusBuildings: readonly number[] = campusGeoJson.features.flatMap((f) => {
  const props: object = f.properties;
  const osm = "osm" in props ? props.osm : null;
  const match = typeof osm === "string" ? /^(way|relation)\/(\d+)$/.exec(osm) : null;
  if (!match) return [];
  return [Number(match[2]) * 10 + (match[1] === "way" ? 2 : 3)];
});

/**
 * Coloured university buildings on top of the base map. Feature state drives
 * the look: `selected` / `dimmed` for the focus effect, `grow` (0..1) for the
 * intro animation.
 */
export function addCampusLayers(map: MapLibreMap): void {
  map.addSource(CAMPUS_SOURCE, { type: "geojson", data: campusMapData, promoteId: "id" });
  map.addLayer({
    id: HALO_LAYER,
    type: "line",
    source: CAMPUS_SOURCE,
    paint: {
      "line-color": ACCENT,
      "line-width": ["interpolate", ["linear"], ["zoom"], 14, 3, 18, 9],
      "line-blur": 1.5,
      "line-opacity": ["case", ["boolean", ["feature-state", "selected"], false], 1, 0],
      "line-opacity-transition": { duration: 300 },
    },
  });
  map.addLayer({
    id: CAMPUS_LAYER,
    type: "fill-extrusion",
    source: CAMPUS_SOURCE,
    paint: {
      "fill-extrusion-color": ["case", ["boolean", ["feature-state", "dimmed"], false], ["get", "mutedColor"], ["get", "color"]],
      "fill-extrusion-height": [
        "*",
        ["+", ["get", "height"], ["case", ["boolean", ["feature-state", "selected"], false], 2, 0]],
        ["number", ["coalesce", ["feature-state", "grow"], 1]],
      ],
      "fill-extrusion-opacity": 0.97,
      "fill-extrusion-vertical-gradient": true,
    },
  });
}

export function setCampusSelection(map: MapLibreMap, selectedId: string | null): void {
  for (const f of campusMapData.features) {
    const id = f.properties.id;
    map.setFeatureState({ source: CAMPUS_SOURCE, id }, { selected: id === selectedId, dimmed: selectedId !== null && id !== selectedId });
  }
}

export function setCampusGrowth(map: MapLibreMap, growById: ReadonlyMap<string, number>): void {
  for (const [id, grow] of growById) map.setFeatureState({ source: CAMPUS_SOURCE, id }, { grow });
}

export const campusFeatureIds: readonly string[] = campusMapData.features.map((f) => f.properties.id);
