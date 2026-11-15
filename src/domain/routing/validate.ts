import { DESTINATION_CATEGORIES, type IndoorBuilding, type LevelId, type Unit } from "../indoor/model";
import type { Vec2 } from "../geometry/vec2";
import { anchorNodeId, buildRouteGraph, MAX_SNAP_DISTANCE, openingNodeId, snapToSegments, walkSegmentsOfLevel } from "./graph";
import type { RouteGraph } from "./types";

export interface ValidationIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  featureId?: string;
}

/** Checks the data invariants the router relies on. Returns an empty list for a clean building. */
export function validateBuilding(building: IndoorBuilding): ValidationIssue[] {
  return [
    ...checkDuplicateIds(building),
    ...checkLevelOrdinals(building),
    ...checkReferences(building),
    ...checkDestinationOpenings(building),
    ...checkDefaultAnchor(building),
    ...checkConnectors(building),
    ...checkWalkwayCoverage(building),
    ...checkSnapping(building),
    ...checkReachability(building),
  ];
}

const error = (code: string, message: string, featureId?: string): ValidationIssue => ({
  severity: "error",
  code,
  message,
  ...(featureId === undefined ? {} : { featureId }),
});

/** Ids must be unique across all feature collections, since routes and URLs refer to them bare. */
function checkDuplicateIds(building: IndoorBuilding): ValidationIssue[] {
  const all = [
    ...building.levels,
    ...building.units,
    ...building.openings,
    ...building.walkways,
    ...building.connectors,
    ...building.anchors,
    ...building.amenities,
  ].map((feature) => feature.id);
  const seen = new Set<string>();
  const reported = new Set<string>();
  const issues: ValidationIssue[] = [];
  for (const id of all) {
    if (seen.has(id) && !reported.has(id)) {
      reported.add(id);
      issues.push(error("duplicate_id", `Id "${id}" is used by more than one feature`, id));
    }
    seen.add(id);
  }
  return issues;
}

function checkLevelOrdinals(building: IndoorBuilding): ValidationIssue[] {
  const ordinals = building.levels.map((level) => level.ordinal).sort((a, b) => a - b);
  const consecutive = ordinals.every((ordinal, i) => ordinal === i);
  return consecutive
    ? []
    : [error("level_ordinals", `Level ordinals must be consecutive from 0, got [${ordinals.join(", ")}]`)];
}

function checkReferences(building: IndoorBuilding): ValidationIssue[] {
  const levelIds = new Set(building.levels.map((level) => level.id));
  const unitIds = new Set(building.units.map((unit) => unit.id));
  const issues: ValidationIssue[] = [];
  const checkLevel = (featureId: string, levelId: LevelId) => {
    if (!levelIds.has(levelId)) issues.push(error("unknown_level", `"${featureId}" refers to unknown level "${levelId}"`, featureId));
  };
  for (const feature of [...building.units, ...building.openings, ...building.walkways, ...building.anchors, ...building.amenities]) {
    checkLevel(feature.id, feature.levelId);
  }
  for (const connector of building.connectors) {
    for (const stop of connector.stops) checkLevel(connector.id, stop.levelId);
  }
  for (const opening of building.openings) {
    if (!unitIds.has(opening.unitId)) {
      issues.push(error("unknown_unit", `Opening "${opening.id}" refers to unknown unit "${opening.unitId}"`, opening.id));
    }
  }
  return issues;
}

function isDestination(unit: Unit): boolean {
  return DESTINATION_CATEGORIES.has(unit.category);
}

function checkDestinationOpenings(building: IndoorBuilding): ValidationIssue[] {
  const unitsWithDoors = new Set(building.openings.map((opening) => opening.unitId));
  return building.units
    .filter((unit) => isDestination(unit) && !unitsWithDoors.has(unit.id))
    .map((unit) => error("destination_without_opening", `Destination unit "${unit.id}" has no opening`, unit.id));
}

function checkDefaultAnchor(building: IndoorBuilding): ValidationIssue[] {
  const count = building.anchors.filter((anchor) => anchor.isDefault).length;
  return count === 1 ? [] : [error("default_anchor", `Expected exactly one default anchor, found ${count}`)];
}

function checkConnectors(building: IndoorBuilding): ValidationIssue[] {
  const ordinals = new Map(building.levels.map((level) => [level.id, level.ordinal]));
  const issues: ValidationIssue[] = [];
  for (const connector of building.connectors) {
    if (connector.stops.length < 2) {
      issues.push(error("connector_stops", `Connector "${connector.id}" has fewer than 2 stops`, connector.id));
      continue;
    }
    const stopOrdinals = connector.stops.map((stop) => ordinals.get(stop.levelId) ?? NaN);
    const ascending = stopOrdinals.every((ordinal, i) => i === 0 || ordinal > stopOrdinals[i - 1]);
    if (!ascending) {
      issues.push(error("connector_order", `Stops of connector "${connector.id}" are not ordered bottom to top`, connector.id));
    }
  }
  return issues;
}

function checkWalkwayCoverage(building: IndoorBuilding): ValidationIssue[] {
  const levelsWithWalkways = new Set(building.walkways.map((walkway) => walkway.levelId));
  const levelsWithOpenings = new Set(building.openings.map((opening) => opening.levelId));
  return building.levels
    .filter((level) => levelsWithOpenings.has(level.id) && !levelsWithWalkways.has(level.id))
    .map((level) => error("level_without_walkways", `Level "${level.id}" has openings but no walkways`, level.id));
}

/** Doors, anchors and connector stops must be close enough to a walkway to be snapped onto it. */
function checkSnapping(building: IndoorBuilding): ValidationIssue[] {
  const located: { id: string; levelId: LevelId; position: Vec2 }[] = [
    ...building.openings,
    ...building.anchors,
    ...building.connectors.flatMap((c) => c.stops.map((stop) => ({ id: c.id, levelId: stop.levelId, position: stop.position }))),
  ];
  const segmentsByLevel = new Map(building.levels.map((level) => [level.id, walkSegmentsOfLevel(building, level.id)]));
  return located
    .filter((feature) => {
      const snap = snapToSegments(segmentsByLevel.get(feature.levelId) ?? [], feature.position);
      return snap === null || snap.distance > MAX_SNAP_DISTANCE;
    })
    .map((feature) =>
      error("not_snapped", `"${feature.id}" is more than ${MAX_SNAP_DISTANCE} m from any walkway on level "${feature.levelId}"`, feature.id),
    );
}

/** Every destination must be reachable from the default anchor; step-free gaps are warnings. */
function checkReachability(building: IndoorBuilding): ValidationIssue[] {
  const anchor = building.anchors.find((a) => a.isDefault);
  if (!anchor) return [];
  const graph = buildRouteGraph(building);
  const start = anchorNodeId(anchor.id);
  if (!graph.nodes.has(start)) return [];
  const reachable = reachableNodeIds(graph, start, false);
  const reachableStepFree = reachableNodeIds(graph, start, true);
  const doorsOf = (unitId: string) =>
    building.openings.filter((opening) => opening.unitId === unitId).map((opening) => openingNodeId(opening.id));
  const issues: ValidationIssue[] = [];
  for (const unit of building.units.filter(isDestination)) {
    const doors = doorsOf(unit.id);
    if (doors.length === 0) continue; // already reported as destination_without_opening
    if (!doors.some((id) => reachable.has(id))) {
      issues.push(error("unreachable", `Unit "${unit.id}" cannot be reached from the default anchor`, unit.id));
    } else if (!doors.some((id) => reachableStepFree.has(id))) {
      issues.push({
        severity: "warning",
        code: "not_step_free",
        message: `Unit "${unit.id}" cannot be reached step-free from the default anchor`,
        featureId: unit.id,
      });
    }
  }
  return issues;
}

function reachableNodeIds(graph: RouteGraph, start: string, stepFree: boolean): Set<string> {
  const visited = new Set([start]);
  const queue = [start];
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    for (const edge of graph.adjacency.get(current) ?? []) {
      if (stepFree && !edge.stepFree) continue;
      const next = edge.from === current ? edge.to : edge.from;
      if (visited.has(next)) continue;
      visited.add(next);
      queue.push(next);
    }
  }
  return visited;
}
