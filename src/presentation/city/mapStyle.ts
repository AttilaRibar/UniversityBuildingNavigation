// Type-only: the style spec package ships with maplibre-gl, whose own typings import it.
import type {
  ExpressionSpecification,
  FilterSpecification,
  LayerSpecification,
  StyleSpecification,
} from "@maplibre/maplibre-gl-style-spec";

export const BASE_SOURCE = "openmaptiles";
const TILEJSON_URL = "https://tiles.openfreemap.org/planet";
const GLYPHS_URL = "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf";

/** Calm blue-grey city, so the university's coloured buildings are the only saturated things. */
export const MAP_COLORS = {
  land: "#d4dde8",
  landuseCampus: "#cbd4e3",
  park: "#c2d3c6",
  wood: "#b8ccbd",
  water: "#9ab5d1",
  roadCasing: "#b8c5d6",
  road: "#fbfcfe",
  minorRoad: "#f1f4f8",
  path: "#e6ebf2",
  rail: "#a3b0c2",
  building: "#eef1f6",
  label: "#4b5b75",
  labelStrong: "#14213d",
  waterLabel: "#56789e",
  halo: "#e3e9f1",
} as const;

const FONT_REGULAR = ["Noto Sans Regular"];
const FONT_BOLD = ["Noto Sans Bold"];
const FONT_ITALIC = ["Noto Sans Italic"];

/** Width that doubles with every zoom level between the stops, like real streets do. */
function roadWidth(stops: readonly [number, number][]): ExpressionSpecification {
  return ["interpolate", ["exponential", 1.6], ["zoom"], ...stops.flat()] as ExpressionSpecification;
}

const notTunnel: ExpressionSpecification = ["!=", ["get", "brunnel"], "tunnel"];

interface RoadClass {
  id: string;
  classes: readonly string[];
  minzoom: number;
  width: readonly [number, number][];
  color: string;
  casing: boolean;
}

const ROADS: readonly RoadClass[] = [
  { id: "path", classes: ["path", "track"], minzoom: 14.5, width: [[14.5, 0.5], [18, 2.5]], color: MAP_COLORS.path, casing: false },
  { id: "service", classes: ["service"], minzoom: 13.5, width: [[13.5, 0.5], [18, 6]], color: MAP_COLORS.minorRoad, casing: false },
  { id: "minor", classes: ["minor"], minzoom: 12, width: [[12, 0.5], [14, 1.6], [18, 14]], color: MAP_COLORS.minorRoad, casing: true },
  {
    id: "secondary",
    classes: ["secondary", "tertiary"],
    minzoom: 10,
    width: [[10, 0.6], [14, 3], [18, 22]],
    color: MAP_COLORS.road,
    casing: true,
  },
  {
    id: "primary",
    classes: ["primary", "trunk", "motorway"],
    minzoom: 8,
    width: [[8, 0.8], [12, 2.2], [14, 4.5], [18, 28]],
    color: MAP_COLORS.road,
    casing: true,
  },
];

function roadLayers(): LayerSpecification[] {
  const filterFor = (classes: readonly string[]): FilterSpecification => ["all", ["in", ["get", "class"], ["literal", [...classes]]], notTunnel];
  const casings: LayerSpecification[] = ROADS.filter((r) => r.casing).map((r) => ({
    id: `road-${r.id}-casing`,
    type: "line",
    source: BASE_SOURCE,
    "source-layer": "transportation",
    minzoom: Math.max(r.minzoom, 12),
    filter: filterFor(r.classes),
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": MAP_COLORS.roadCasing,
      "line-width": roadWidth(r.width.map(([z, w]) => [z, w + Math.max(1, w * 0.18)] as [number, number])),
    },
  }));
  const fills: LayerSpecification[] = ROADS.map((r) => ({
    id: `road-${r.id}`,
    type: "line",
    source: BASE_SOURCE,
    "source-layer": "transportation",
    minzoom: r.minzoom,
    filter: filterFor(r.classes),
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": r.color, "line-width": roadWidth(r.width) },
  }));
  return [...casings, ...fills];
}

/**
 * Our own compact OpenMapTiles style. Generic buildings are light grey
 * extrusions that rise as you zoom in; `hiddenBuildingIds` removes the
 * base-map copies of the university buildings, which are drawn in colour.
 */
export function createCityStyle(hiddenBuildingIds: readonly number[]): StyleSpecification {
  return {
    version: 8,
    glyphs: GLYPHS_URL,
    sources: {
      [BASE_SOURCE]: { type: "vector", url: TILEJSON_URL },
    },
    light: { anchor: "viewport", color: "#ffffff", intensity: 0.38, position: [1.2, 205, 32] },
    layers: [
      { id: "background", type: "background", paint: { "background-color": MAP_COLORS.land } },
      {
        id: "landuse-campus",
        type: "fill",
        source: BASE_SOURCE,
        "source-layer": "landuse",
        filter: ["in", ["get", "class"], ["literal", ["university", "college", "school", "hospital"]]],
        paint: { "fill-color": MAP_COLORS.landuseCampus },
      },
      {
        id: "park",
        type: "fill",
        source: BASE_SOURCE,
        "source-layer": "park",
        paint: { "fill-color": MAP_COLORS.park, "fill-opacity": 0.85 },
      },
      {
        id: "landcover",
        type: "fill",
        source: BASE_SOURCE,
        "source-layer": "landcover",
        filter: ["in", ["get", "class"], ["literal", ["grass", "wood"]]],
        paint: {
          "fill-color": ["match", ["get", "class"], "wood", MAP_COLORS.wood, MAP_COLORS.park],
          "fill-opacity": 0.8,
        },
      },
      {
        id: "water",
        type: "fill",
        source: BASE_SOURCE,
        "source-layer": "water",
        filter: notTunnel,
        paint: { "fill-color": MAP_COLORS.water },
      },
      {
        id: "waterway",
        type: "line",
        source: BASE_SOURCE,
        "source-layer": "waterway",
        minzoom: 11,
        filter: notTunnel,
        paint: { "line-color": MAP_COLORS.water, "line-width": roadWidth([[11, 0.5], [18, 4]]) },
      },
      ...roadLayers(),
      {
        id: "rail",
        type: "line",
        source: BASE_SOURCE,
        "source-layer": "transportation",
        minzoom: 11,
        filter: ["all", ["in", ["get", "class"], ["literal", ["rail", "transit"]]], notTunnel],
        paint: { "line-color": MAP_COLORS.rail, "line-width": roadWidth([[11, 0.6], [18, 3]]) },
      },
      {
        id: "rail-ties",
        type: "line",
        source: BASE_SOURCE,
        "source-layer": "transportation",
        minzoom: 14,
        filter: ["all", ["in", ["get", "class"], ["literal", ["rail", "transit"]]], notTunnel],
        paint: { "line-color": MAP_COLORS.land, "line-width": roadWidth([[14, 0.6], [18, 1.6]]), "line-dasharray": [2, 3] },
      },
      {
        id: "building-3d",
        type: "fill-extrusion",
        source: BASE_SOURCE,
        "source-layer": "building",
        minzoom: 13.5,
        filter: [
          "all",
          ["!=", ["get", "hide_3d"], true],
          ["!", ["in", ["id"], ["literal", [...hiddenBuildingIds]]]],
        ],
        paint: {
          "fill-extrusion-color": MAP_COLORS.building,
          "fill-extrusion-height": [
            "interpolate",
            ["linear"],
            ["zoom"],
            13.5,
            0,
            15.5,
            ["coalesce", ["get", "render_height"], 8],
          ],
          "fill-extrusion-base": ["interpolate", ["linear"], ["zoom"], 13.5, 0, 15.5, ["coalesce", ["get", "render_min_height"], 0]],
          "fill-extrusion-opacity": ["interpolate", ["linear"], ["zoom"], 13.5, 0, 14.5, 0.92],
          "fill-extrusion-vertical-gradient": true,
        },
      },
      ...(["line", "point"] as const).map(
        (placement): LayerSpecification => ({
          id: `water-name-${placement}`,
          type: "symbol",
          source: BASE_SOURCE,
          "source-layer": "water_name",
          // Placement cannot depend on data, so rivers (lines) and lakes (points) get a layer each.
          filter: ["==", ["geometry-type"], placement === "line" ? "LineString" : "Point"],
          layout: {
            "text-field": ["get", "name"],
            "text-font": FONT_ITALIC,
            "text-size": 13,
            "text-letter-spacing": 0.2,
            "symbol-placement": placement,
          },
          paint: { "text-color": MAP_COLORS.waterLabel, "text-halo-color": MAP_COLORS.water, "text-halo-width": 1 },
        }),
      ),
      {
        id: "road-name",
        type: "symbol",
        source: BASE_SOURCE,
        "source-layer": "transportation_name",
        minzoom: 14,
        filter: ["in", ["get", "class"], ["literal", ["primary", "secondary", "tertiary", "minor", "trunk"]]],
        layout: {
          "text-field": ["get", "name"],
          "text-font": FONT_REGULAR,
          "text-size": ["interpolate", ["linear"], ["zoom"], 14, 10.5, 18, 13],
          "symbol-placement": "line",
          "text-max-angle": 30,
        },
        paint: { "text-color": MAP_COLORS.label, "text-halo-color": MAP_COLORS.road, "text-halo-width": 1.4 },
      },
      {
        id: "place-district",
        type: "symbol",
        source: BASE_SOURCE,
        "source-layer": "place",
        minzoom: 11,
        maxzoom: 16,
        // Districts only when zoomed out; smaller quarters join in once there is room.
        filter: [
          "any",
          ["==", ["get", "class"], "suburb"],
          ["all", [">=", ["zoom"], 13], ["in", ["get", "class"], ["literal", ["quarter", "neighbourhood"]]]],
        ],
        layout: {
          "text-field": ["get", "name"],
          "text-font": FONT_BOLD,
          "text-size": ["interpolate", ["linear"], ["zoom"], 11, 10, 15, 12],
          "text-transform": "uppercase",
          "text-letter-spacing": 0.12,
          "text-max-width": 8,
        },
        paint: {
          "text-color": MAP_COLORS.label,
          "text-opacity": 0.75,
          "text-halo-color": MAP_COLORS.halo,
          "text-halo-width": 1.2,
        },
      },
      {
        id: "place-city",
        type: "symbol",
        source: BASE_SOURCE,
        "source-layer": "place",
        maxzoom: 11.5,
        filter: ["==", ["get", "class"], "city"],
        layout: { "text-field": ["get", "name"], "text-font": FONT_BOLD, "text-size": 16 },
        paint: { "text-color": MAP_COLORS.labelStrong, "text-halo-color": MAP_COLORS.halo, "text-halo-width": 1.5 },
      },
    ],
  };
}
