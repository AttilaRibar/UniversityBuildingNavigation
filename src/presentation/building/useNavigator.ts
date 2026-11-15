"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { centroid } from "@/domain/geometry/polygon";
import type { Vec2 } from "@/domain/geometry/vec2";
import { defaultAnchor, type IndoorBuilding, type Unit, type UnitCategory } from "@/domain/indoor/model";
import { buildRouteGraph, buildSteps, condenseSteps, findRoute, findRouteToNearest, type Route, type RoutePoint } from "@/domain/routing";
import { buildingHref } from "@/application/links";
import type { SceneFocus, SceneMode } from "./scene/BuildingScene";
import type { NavStep } from "./stepText";

/**
 * - `explore`: looking around, nothing selected
 * - `place`: a destination is selected and its card is shown
 * - `route`: the route is on screen; `stepIndex` null means the whole-route overview
 */
export type NavigatorPhase = "explore" | "place" | "route";

export interface NavigatorState {
  phase: NavigatorPhase;
  destination: Unit | null;
  origin: RoutePoint;
  stepFree: boolean;
  /** Level shown while exploring; null = all levels stacked. */
  levelId: string | null;
  stepIndex: number | null;
  route: Route | null;
  /** Indoor route steps, after an `approach` step when the route starts at an entrance. */
  steps: readonly NavStep[];
  /** True when a destination is set but no route exists with the current options. */
  routeMissing: boolean;
}

const pointOf = (id: string, building: IndoorBuilding): RoutePoint | null => {
  if (building.anchors.some((a) => a.id === id)) return { type: "anchor", anchorId: id };
  if (building.units.some((u) => u.id === id)) return { type: "unit", unitId: id };
  return null;
};

const idOf = (point: RoutePoint): string => (point.type === "anchor" ? point.anchorId : point.unitId);

/** Where a route point is drawn: an anchor's own position, or a room's first door. */
export function positionOf(point: RoutePoint, building: IndoorBuilding): { levelId: string; position: Vec2 } | null {
  if (point.type === "anchor") {
    const anchor = building.anchors.find((a) => a.id === point.anchorId);
    return anchor ? { levelId: anchor.levelId, position: anchor.position } : null;
  }
  const unit = building.units.find((u) => u.id === point.unitId);
  if (!unit) return null;
  const door = building.openings.find((o) => o.unitId === unit.id);
  return { levelId: unit.levelId, position: door?.position ?? centroid(unit.polygon) };
}

/**
 * All navigation state of the indoor screen and the transitions between its
 * phases. Pure UI state: routing itself is delegated to the domain layer.
 */
export function useNavigator(building: IndoorBuilding) {
  const graph = useMemo(() => buildRouteGraph(building), [building]);
  const fallbackOrigin = useMemo<RoutePoint>(() => ({ type: "anchor", anchorId: defaultAnchor(building).id }), [building]);

  const [phase, setPhase] = useState<NavigatorPhase>("explore");
  const [destinationId, setDestinationId] = useState<string | null>(null);
  const [origin, setOriginState] = useState<RoutePoint>(fallbackOrigin);
  const [stepFree, setStepFree] = useState(false);
  const [levelId, setLevelId] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState<number | null>(null);

  // Deep link: ?to=F.06&from=doberdo-entrance&sf=1 opens straight on that room.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const to = params.get("to");
    const from = params.get("from");
    const unit = to ? building.units.find((u) => u.id === to || u.ref === to) : undefined;
    const start = from ? pointOf(from, building) : null;
    /* eslint-disable react-hooks/set-state-in-effect -- one-off sync with the URL, which only exists in the browser */
    if (start) setOriginState(start);
    if (params.get("sf") === "1") setStepFree(true);
    if (unit) {
      setDestinationId(unit.id);
      setLevelId(unit.levelId);
      setPhase("place");
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [building]);

  const destination = useMemo(() => building.units.find((u) => u.id === destinationId) ?? null, [building, destinationId]);

  const route = useMemo(
    () => (destination ? findRoute(building, graph, origin, { type: "unit", unitId: destination.id }, { stepFree }) : null),
    [building, graph, origin, destination, stepFree],
  );
  const steps = useMemo<readonly NavStep[]>(() => {
    if (!route) return [];
    const indoor = condenseSteps(buildSteps(building, route));
    // Coming from the street, the first thing to find is the door: show that on the street map first.
    const anchor = origin.type === "anchor" ? building.anchors.find((a) => a.id === origin.anchorId) : undefined;
    if (anchor?.kind !== "entrance") return indoor;
    return [{ type: "approach", anchorId: anchor.id, levelId: anchor.levelId, position: anchor.position }, ...indoor];
  }, [building, route, origin]);

  // Keep the address bar shareable without triggering a navigation.
  useEffect(() => {
    const href = buildingHref(building.id, {
      to: destination?.id,
      from: idOf(origin) === idOf(fallbackOrigin) ? undefined : idOf(origin),
      stepFree,
    });
    window.history.replaceState(window.history.state, "", href);
  }, [building.id, destination, origin, stepFree, fallbackOrigin]);

  const selectDestination = useCallback(
    (unitId: string) => {
      const unit = building.units.find((u) => u.id === unitId);
      if (!unit) return;
      setDestinationId(unit.id);
      setLevelId(unit.levelId);
      setStepIndex(null);
      setPhase("place");
    },
    [building],
  );

  /** "Nearest restroom": the closest unit of a category by walking cost from the origin. */
  const selectNearest = useCallback(
    (categories: readonly UnitCategory[]) => {
      const candidates = building.units.filter((u) => categories.includes(u.category)).map((u) => u.id);
      const nearest = findRouteToNearest(building, graph, origin, candidates, { stepFree });
      const reached = nearest?.destination.type === "unit" ? nearest.destination.unitId : candidates[0];
      if (reached) selectDestination(reached);
    },
    [building, graph, origin, stepFree, selectDestination],
  );

  const clearDestination = useCallback(() => {
    setDestinationId(null);
    setStepIndex(null);
    setPhase("explore");
  }, []);

  const setOrigin = useCallback((point: RoutePoint) => {
    setOriginState(point);
    setStepIndex(null);
  }, []);

  const showLevel = useCallback((id: string | null) => setLevelId(id), []);
  const startRoute = useCallback(() => {
    setStepIndex(null);
    setPhase("route");
  }, []);
  const endRoute = useCallback(() => {
    setStepIndex(null);
    setPhase("place");
  }, []);
  const goToStep = useCallback((index: number | null) => setStepIndex(index), []);
  const toggleStepFree = useCallback(() => {
    setStepFree((value) => !value);
    setStepIndex(null);
  }, []);

  const state: NavigatorState = {
    phase,
    destination,
    origin,
    stepFree,
    levelId,
    stepIndex: phase === "route" && stepIndex !== null && stepIndex < steps.length ? stepIndex : null,
    route,
    steps,
    routeMissing: destination !== null && route === null,
  };

  return { state, graph, selectDestination, selectNearest, clearDestination, setOrigin, showLevel, startRoute, endRoute, goToStep, toggleStepFree };
}

export type Navigator = ReturnType<typeof useNavigator>;

/** Levels a route passes through, lowest first. */
export function routeLevelIds(route: Route): string[] {
  const ids = new Set<string>();
  for (const leg of route.legs) {
    if (leg.type === "walk") ids.add(leg.levelId);
    else {
      ids.add(leg.fromLevelId);
      ids.add(leg.toLevelId);
    }
  }
  return [...ids];
}

/** What the 3D scene should show for the current navigation state. */
export function sceneViewOf(state: NavigatorState): { mode: SceneMode; focus: SceneFocus | null } {
  const { phase, destination, route, steps, stepIndex, levelId } = state;

  if (phase === "route" && route && route.legs.length > 0) {
    const levelIds = routeLevelIds(route);
    const step = stepIndex === null ? null : steps[stepIndex];
    // The approach is shown on the street map; behind it the model waits in the route overview.
    if (!step || step.type === "approach") return { mode: { type: "route", levelIds, focusLevelId: null }, focus: null };
    if (step.type === "connector") {
      return {
        mode: { type: "route", levelIds, focusLevelId: step.toLevelId },
        focus: { type: "connector", fromLevelId: step.fromLevelId, toLevelId: step.toLevelId, from: step.from, to: step.to },
      };
    }
    const focus: SceneFocus =
      step.type === "arrive" ? { type: "point", levelId: step.levelId, position: step.position } : { type: "walk", levelId: step.levelId, points: step.points };
    return { mode: { type: "route", levelIds, focusLevelId: step.levelId }, focus };
  }

  // With a destination selected its level is shown, unless the user switched to another one.
  const shown = phase === "explore" ? levelId : (levelId ?? destination?.levelId ?? null);
  return { mode: shown ? { type: "level", levelId: shown } : { type: "overview" }, focus: null };
}
