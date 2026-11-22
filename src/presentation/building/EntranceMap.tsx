"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { Map as MapLibreMap, Marker, setWorkerUrl } from "maplibre-gl";
import { useEffect, useMemo, useRef } from "react";
import { track } from "@/application/analytics";
import { campusBuildingById } from "@/data/campus";
import { bearingBetween, localToLngLat } from "@/domain/geometry/georef";
import type { IndoorBuilding } from "@/domain/indoor/model";
import { addCampusLayers, baseMapCopiesOfCampusBuildings, CAMPUS_SOURCE, setCampusSelection } from "@/presentation/city/campusLayers";
import { BASE_SOURCE, createCityStyle } from "@/presentation/city/mapStyle";
import { Compass, syncCompass } from "@/presentation/ui/Compass";
import type { SceneInsets } from "./scene/BuildingScene";
import "./entranceMap.css";

setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);

export interface EntranceMapProps {
  building: IndoorBuilding;
  anchorId: string;
  /** Text of the pin over the door. */
  label: string;
  insets: SceneInsets;
}

const ZOOM = 17.4;
const PITCH = 58;
/** Breathing room around the door on top of whatever the panels cover. */
const MARGIN = 24;

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * Street-level view for the first step of a route that starts outside: the
 * building in colour, the door pinned, and the camera standing on the street
 * looking at the entrance. Rotatable like the city map; the tilt stays fixed.
 */
export default function EntranceMap({ building, anchorId, label, insets }: EntranceMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const compassRef = useRef<HTMLButtonElement>(null);
  const latest = useRef({ insets, label });
  useEffect(() => {
    latest.current = { insets, label };
  });

  const view = useMemo(() => {
    const anchor = building.anchors.find((a) => a.id === anchorId);
    if (!anchor) return null;
    const door = localToLngLat(building.georeference, anchor.position);
    const footprint = campusBuildingById(building.id)?.location;
    // Stand outside and look through the door towards the middle of the building.
    const bearing = footprint ? bearingBetween(door, footprint) : 0;
    return { door, bearing };
  }, [building, anchorId]);

  const padding = (i: SceneInsets) => ({
    top: i.top + MARGIN,
    bottom: i.bottom + MARGIN,
    left: i.left + MARGIN,
    right: i.right + MARGIN,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !view) return;
    let map: MapLibreMap;
    try {
      map = new MapLibreMap({
        container,
        style: createCityStyle(baseMapCopiesOfCampusBuildings),
        center: view.door,
        zoom: ZOOM - 0.8,
        pitch: PITCH,
        bearing: view.bearing - 25,
        minPitch: PITCH,
        maxPitch: PITCH,
        minZoom: 15,
        maxZoom: 19.5,
        dragRotate: true,
        pitchWithRotate: false,
        touchPitch: false,
        rollEnabled: false,
        attributionControl: false,
        fadeDuration: 150,
      });
    } catch {
      // No WebGL: the instruction banner still says which door to use.
      track("map_unavailable", { screen: "entrance", reason: "webgl" });
      return;
    }
    mapRef.current = map;
    map.setPadding(padding(latest.current.insets));

    const pin = document.createElement("div");
    pin.className = "entrance-pin";
    const chip = document.createElement("span");
    chip.className = "entrance-pin-label";
    chip.textContent = latest.current.label;
    const stem = document.createElement("span");
    stem.className = "entrance-pin-stem";
    const dot = document.createElement("span");
    dot.className = "entrance-pin-dot";
    pin.append(chip, stem, dot);
    const marker = new Marker({ element: pin, anchor: "bottom", offset: [0, 8] }).setLngLat(view.door).addTo(map);

    map.on("style.load", () => {
      if (!map.getSource(CAMPUS_SOURCE)) addCampusLayers(map);
      setCampusSelection(map, building.id);
    });
    map.on("rotate", () => syncCompass(compassRef.current, map.getBearing(), view.bearing));
    // Swing in from the side, so it is clear which way the street runs.
    map.once("load", () => {
      map.easeTo({ zoom: ZOOM, bearing: view.bearing, duration: 1600, easing: easeInOutCubic });
    });
    // If tiles are slow, `load` comes late; never leave the camera on the approach angle.
    const fallback = window.setTimeout(() => {
      if (!map.loaded()) map.easeTo({ zoom: ZOOM, bearing: view.bearing, duration: 0 });
    }, 4000);
    map.on("sourcedata", (e) => {
      if (e.sourceId === BASE_SOURCE && e.tile) window.clearTimeout(fallback);
    });

    return () => {
      window.clearTimeout(fallback);
      marker.remove();
      mapRef.current = null;
      map.remove();
    };
  }, [building, view]);

  useEffect(() => {
    mapRef.current?.easeTo({ padding: padding(insets), duration: 300 });
  }, [insets]);

  useEffect(() => {
    const chip = containerRef.current?.querySelector(".entrance-pin-label");
    if (chip) chip.textContent = label;
  }, [label]);

  const reset = () => {
    if (view) mapRef.current?.easeTo({ bearing: view.bearing, zoom: ZOOM, center: view.door, duration: 700, easing: easeInOutCubic });
  };

  return (
    <div className="entrance-map">
      <div ref={containerRef} className="size-full" />
      <Compass ref={compassRef} onReset={reset} className="absolute right-3" style={{ top: insets.top + 12 }} />
      <p className="entrance-map-attribution" style={{ bottom: insets.bottom + 6 }}>
        © OpenFreeMap © OpenMapTiles © OpenStreetMap
      </p>
    </div>
  );
}
