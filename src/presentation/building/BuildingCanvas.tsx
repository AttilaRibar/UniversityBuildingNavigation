"use client";

import { useEffect, useRef } from "react";
import type { Vec2 } from "@/domain/geometry/vec2";
import type { IndoorBuilding } from "@/domain/indoor/model";
import type { RouteLeg } from "@/domain/routing";
import { BuildingScene, type SceneFocus, type SceneInsets, type SceneLabels, type SceneMode } from "./scene/BuildingScene";
import "./scene/scene.css";

export interface BuildingCanvasProps {
  building: IndoorBuilding;
  mode: SceneMode;
  labels: SceneLabels;
  destinationUnitId: string | null;
  originUnitId: string | null;
  /** Legs of the current route and where its "start" marker goes. */
  route: { legs: readonly RouteLeg[]; origin: { levelId: string; position: Vec2 } } | null;
  /** The part of the route to zoom to; null frames everything that is visible. */
  focus: SceneFocus | null;
  insets: SceneInsets;
  onUnitTap: (unitId: string) => void;
  onLevelTap: (levelId: string) => void;
  onError: () => void;
}

/**
 * Thin React shell around `BuildingScene`: creates it once and forwards prop
 * changes to its setters. All 3D state lives in the scene object.
 */
export function BuildingCanvas(props: BuildingCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<BuildingScene | null>(null);
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  });

  const { building, mode, labels, destinationUnitId, originUnitId, route, focus, insets } = props;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let scene: BuildingScene;
    try {
      scene = new BuildingScene(
        container,
        building,
        latest.current.labels,
        {
          onUnitTap: (id) => latest.current.onUnitTap(id),
          onLevelTap: (id) => latest.current.onLevelTap(id),
        },
        reducedMotion,
      );
    } catch {
      // No WebGL (old phone, blocked GPU): the text UI keeps working without the model.
      latest.current.onError();
      return;
    }
    scene.setInsets(latest.current.insets);
    sceneRef.current = scene;
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, [building]);

  useEffect(() => sceneRef.current?.setLabels(labels), [labels]);
  useEffect(() => sceneRef.current?.setInsets(insets), [insets]);
  useEffect(() => sceneRef.current?.setHighlight(destinationUnitId, originUnitId), [destinationUnitId, originUnitId, building]);
  useEffect(() => sceneRef.current?.setRoute(route?.legs ?? null, route?.origin ?? null, true), [route, building]);
  // Mode first, then focus: focusing needs the levels' target positions of the new mode.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.setMode(mode, { reframe: focus === null });
    if (focus) scene.focus(focus);
  }, [mode, focus, insets, building]);

  return <div ref={containerRef} className="scene-root" role="img" aria-label={building.name.hu} />;
}
