"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { Map as MapLibreMap, setWorkerUrl, type PaddingOptions } from "maplibre-gl";
import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { campusBuildingById } from "@/data/campus";
import { useI18n, useMessages } from "@/presentation/i18n/I18nProvider";
import { cityEn, cityHu } from "@/presentation/i18n/messages/city";
import {
  BUDAPEST_BOUNDS,
  CAMERA,
  CAMPUS_MAX_ZOOM,
  FOCUS_ZOOM,
  MAX_OBSCURED_SHARE,
  VIEW_MARGIN,
} from "./cameraConfig";
import { Compass, syncCompass } from "@/presentation/ui/Compass";
import { CAMPUS_LAYER, CAMPUS_SOURCE, addCampusLayers, baseMapCopiesOfCampusBuildings, setCampusSelection } from "./campusLayers";
import { allBuildingsBounds, buildingBounds } from "./campuses";
import "./cityMap.css";
import { flattenCampusBuildings, growCampusBuildings } from "./introAnimation";
import { useLabelData } from "./labelData";
import { MapLabels } from "./mapLabels";
import { BASE_SOURCE, createCityStyle } from "./mapStyle";
import { createMapOrbit, type MapOrbit } from "./orbit";

// The worker ships as a separate ES module; the bundler emits it as an asset.
setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);

export type CityMapStatus = "ready" | "degraded" | "failed";

/** Pixels of the map hidden behind floating UI, so the camera keeps its subject in the clear. */
export interface MapObscured {
  top: number;
  left: number;
  bottom: number;
}

export interface CityMapProps {
  selectedId: string | null;
  onSelect: (buildingId: string | null) => void;
  obscured: MapObscured;
  onStatusChange: (status: CityMapStatus) => void;
}

/** Half of a typical campus chip's width. */
const OVERVIEW_SIDE_MARGIN = 64;
/** Without a single base-map tile after this long, tell the user rather than show an empty map. */
const BASE_TILE_TIMEOUT_MS = 9000;
/** A lost WebGL context that is not restored within this time counts as a failed map. */
const CONTEXT_RESTORE_MS = 4000;

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

function cameraPadding(obscured: MapObscured, mapHeight: number): Required<PaddingOptions> {
  return {
    top: obscured.top + VIEW_MARGIN.top,
    left: obscured.left + VIEW_MARGIN.side,
    right: VIEW_MARGIN.side,
    bottom: Math.min(obscured.bottom, mapHeight * MAX_OBSCURED_SHARE) + VIEW_MARGIN.bottom,
  };
}

/**
 * The 3D overview map: grey city, coloured university buildings, label chips.
 * Knows nothing about the surrounding screen beyond what `obscured` tells it.
 */
export default function CityMap({ selectedId, onSelect, obscured, onStatusChange }: CityMapProps) {
  const m = useMessages(cityHu, cityEn);
  const { locale } = useI18n();
  const reduceMotion = useReducedMotion() ?? false;
  const labelData = useLabelData();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const labelsRef = useRef<MapLabels | null>(null);
  const loadedRef = useRef(false);
  const cameraFrame = useRef(0);
  const orbitRef = useRef<MapOrbit | null>(null);
  const compassRef = useRef<HTMLButtonElement>(null);

  /** Latest props for map event handlers, which are registered once. */
  const latest = useRef({ selectedId, onSelect, obscured, onStatusChange, reduceMotion, labelData });
  useEffect(() => {
    latest.current = { selectedId, onSelect, obscured, onStatusChange, reduceMotion, labelData };
  });

  const padding = () => {
    const map = mapRef.current;
    return cameraPadding(latest.current.obscured, map ? map.getContainer().clientHeight : window.innerHeight);
  };

  /** The overview keeps chips (centred on their campus) from being cut off at the sides. */
  const overviewPadding = () => {
    const p = padding();
    return { ...p, left: p.left + OVERVIEW_SIDE_MARGIN, right: p.right + OVERVIEW_SIDE_MARGIN };
  };

  /** Brings the selected building into the clear area, or just applies new padding. Coalesced per frame. */
  const scheduleCamera = () => {
    cancelAnimationFrame(cameraFrame.current);
    cameraFrame.current = requestAnimationFrame(() => {
      const map = mapRef.current;
      if (!map || !loadedRef.current) return;
      const building = latest.current.selectedId ? campusBuildingById(latest.current.selectedId) : undefined;
      if (!building) {
        map.easeTo({ padding: padding(), duration: latest.current.reduceMotion ? 0 : 450, easing: easeOutCubic });
        return;
      }
      // The orbit waits for the flight to land, then turns the building slowly on the spot.
      if (!latest.current.reduceMotion) orbitRef.current?.start();
      map.flyTo({
        center: [building.location[0], building.location[1]],
        zoom: Math.max(map.getZoom(), FOCUS_ZOOM),
        padding: padding(),
        duration: latest.current.reduceMotion ? 0 : undefined,
        maxDuration: 1800,
        curve: 1.3,
        easing: easeInOutCubic,
      });
    });
  };

  const buildLabels = (map: MapLibreMap, intro: boolean) => {
    labelsRef.current?.destroy();
    const { campuses, buildings, campusAriaLabel } = latest.current.labelData;
    labelsRef.current = new MapLabels(map, {
      campuses,
      buildings,
      campusAriaLabel,
      intro,
      onBuilding: (id) => latest.current.onSelect(id),
      onCampus: (ids) => {
        map.fitBounds(buildingBounds(ids), {
          padding: padding(),
          maxZoom: CAMPUS_MAX_ZOOM,
          bearing: map.getBearing(),
          duration: latest.current.reduceMotion ? 0 : 1200,
          easing: easeInOutCubic,
        });
        if (!latest.current.reduceMotion) orbitRef.current?.start();
      },
    });
    labelsRef.current.setSelected(latest.current.selectedId);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const report = latest.current.onStatusChange;
    let map: MapLibreMap;
    try {
      map = new MapLibreMap({
        container,
        style: createCityStyle(baseMapCopiesOfCampusBuildings),
        bounds: allBuildingsBounds,
        fitBoundsOptions: { padding: overviewPadding() },
        pitch: CAMERA.pitch,
        bearing: CAMERA.bearing,
        minPitch: CAMERA.pitch,
        maxPitch: CAMERA.pitch,
        minZoom: CAMERA.minZoom,
        maxZoom: CAMERA.maxZoom,
        maxBounds: BUDAPEST_BOUNDS,
        // Turning is allowed (right-drag, ctrl-drag, two-finger twist); the tilt stays fixed.
        dragRotate: true,
        pitchWithRotate: false,
        touchPitch: false,
        rollEnabled: false,
        attributionControl: false,
        fadeDuration: 200,
      });
    } catch {
      report("failed");
      return;
    }
    mapRef.current = map;
    map.getCanvas().setAttribute("aria-label", latest.current.labelData.mapLabel);
    const orbit = createMapOrbit(map);
    orbitRef.current = orbit;

    let status: CityMapStatus | null = null;
    const setStatus = (next: CityMapStatus) => {
      if (status === next) return;
      status = next;
      latest.current.onStatusChange(next);
    };
    let baseTileLoaded = false;
    let cancelGrowth = () => {};
    let restoreTimer = 0;

    // A stalled tile request must not keep the whole map blank, so tell the user after a while.
    const tileWatchdog = window.setTimeout(() => {
      if (!baseTileLoaded) setStatus("degraded");
    }, BASE_TILE_TIMEOUT_MS);

    map.on("sourcedata", (e) => {
      if (e.sourceId !== BASE_SOURCE || !e.tile || baseTileLoaded) return;
      baseTileLoaded = true;
      if (loadedRef.current) setStatus("ready");
    });
    map.on("error", (e) => {
      const sourceId = (e as { sourceId?: unknown }).sourceId;
      if (baseTileLoaded || (sourceId !== undefined && sourceId !== BASE_SOURCE)) return;
      setStatus("degraded");
    });
    // The map rebuilds its style after a context restore; `style.load` below re-adds our layers.
    map.on("webglcontextlost", () => {
      window.clearTimeout(restoreTimer);
      restoreTimer = window.setTimeout(() => setStatus("failed"), CONTEXT_RESTORE_MS);
    });
    map.on("webglcontextrestored", () => window.clearTimeout(restoreTimer));
    map.on("rotate", () => syncCompass(compassRef.current, map.getBearing(), CAMERA.bearing));

    const firstSetup = () => {
      loadedRef.current = true;
      const intro = !latest.current.reduceMotion && latest.current.selectedId === null;
      if (intro) {
        flattenCampusBuildings(map);
        cancelGrowth = growCampusBuildings(map);
        // Start a little further out and settle in, so the city "arrives".
        const target = map.cameraForBounds(allBuildingsBounds, { padding: overviewPadding() });
        if (target) {
          map.jumpTo({ ...target, zoom: (target.zoom ?? map.getZoom()) - 0.7, bearing: CAMERA.bearing, pitch: CAMERA.pitch });
          map.easeTo({ ...target, bearing: CAMERA.bearing, pitch: CAMERA.pitch, duration: 2000, easing: easeOutCubic });
        }
      }
      buildLabels(map, intro);
      if (latest.current.selectedId) scheduleCamera();
      if (status !== "degraded") setStatus("ready");
    };

    // Our overlays only need the style, not the base tiles: waiting for `load` (all tiles
    // of the first view) left the map empty whenever a single tile request stalled.
    map.on("style.load", () => {
      if (!map.getSource(CAMPUS_SOURCE)) {
        addCampusLayers(map);
        setCampusSelection(map, latest.current.selectedId);
      }
      if (!loadedRef.current) firstSetup();
    });

    map.on("click", (e) => {
      const hit = map.queryRenderedFeatures(e.point, { layers: [CAMPUS_LAYER] })[0];
      const id = hit?.properties?.id;
      latest.current.onSelect(typeof id === "string" ? id : null);
    });
    map.on("mouseenter", CAMPUS_LAYER, () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", CAMPUS_LAYER, () => (map.getCanvas().style.cursor = ""));

    // Coming back from the back/forward cache or a hidden tab: make sure the canvas matches the box.
    const onPageShow = () => map.resize();
    window.addEventListener("pageshow", onPageShow);

    return () => {
      window.removeEventListener("pageshow", onPageShow);
      window.clearTimeout(tileWatchdog);
      window.clearTimeout(restoreTimer);
      cancelAnimationFrame(cameraFrame.current);
      cancelGrowth();
      orbit.destroy();
      orbitRef.current = null;
      labelsRef.current?.destroy();
      labelsRef.current = null;
      loadedRef.current = false;
      mapRef.current = null;
      map.remove();
    };
    // The map is created once; handlers read the latest props through `latest`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    setCampusSelection(map, selectedId);
    labelsRef.current?.setSelected(selectedId);
    if (selectedId) scheduleCamera();
    else orbitRef.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    scheduleCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obscured.top, obscured.left, obscured.bottom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    map.getCanvas().setAttribute("aria-label", m.mapLabel);
    buildLabels(map, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  const resetRotation = () => {
    orbitRef.current?.stop();
    mapRef.current?.easeTo({ bearing: CAMERA.bearing, duration: latest.current.reduceMotion ? 0 : 700, easing: easeInOutCubic });
  };

  return (
    <div className="city-map">
      <div ref={containerRef} className="size-full" />
      <Compass
        ref={compassRef}
        onReset={resetRotation}
        className="absolute top-[calc(max(12px,env(safe-area-inset-top))+56px)] right-3 z-10 md:top-[72px] md:right-4"
      />
      <p
        className="city-map-attribution"
        style={{ bottom: `calc(min(${obscured.bottom}px, ${MAX_OBSCURED_SHARE * 100}%) + 6px)` }}
      >
        ©{" "}
        <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">
          OpenFreeMap
        </a>{" "}
        ©{" "}
        <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener noreferrer">
          OpenMapTiles
        </a>{" "}
        ©{" "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
          OpenStreetMap
        </a>
      </p>
    </div>
  );
}
