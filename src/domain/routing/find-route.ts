import { distance, type Vec2 } from "../geometry/vec2";
import type { ConnectorKind, IndoorBuilding, LevelId } from "../indoor/model";
import { BinaryHeap } from "./binary-heap";
import { edgeDuration } from "./costs";
import { anchorNodeId, openingNodeId } from "./graph";
import { simplifyPolyline } from "./polyline";
import type { GraphEdge, GraphNode, Route, RouteGraph, RouteLeg, RouteOptions, RoutePoint } from "./types";

/** A path through the graph: `edges[i]` joins `nodeIds[i]` and `nodeIds[i + 1]`. */
interface GraphPath {
  nodeIds: string[];
  edges: GraphEdge[];
}

/** Cheapest route between two points, or null when the destination cannot be reached. */
export function findRoute(
  building: IndoorBuilding,
  graph: RouteGraph,
  origin: RoutePoint,
  destination: RoutePoint,
  options: RouteOptions,
): Route | null {
  if (sameRoutePoint(origin, destination)) return emptyRoute(origin, destination);
  const path = searchPath(graph, endpointNodeIds(building, graph, origin), endpointNodeIds(building, graph, destination), options);
  return path ? assembleRoute(building, graph, origin, destination, path) : null;
}

/**
 * Cheapest route to whichever of `unitIds` is closest in cost, e.g. the
 * nearest restroom. The route's destination is the unit actually reached.
 */
export function findRouteToNearest(
  building: IndoorBuilding,
  graph: RouteGraph,
  origin: RoutePoint,
  unitIds: readonly string[],
  options: RouteOptions,
): Route | null {
  const goals = unitIds.flatMap((unitId) => endpointNodeIds(building, graph, { type: "unit", unitId }));
  const path = searchPath(graph, endpointNodeIds(building, graph, origin), goals, options);
  if (!path) return null;
  const reached = graph.nodes.get(path.nodeIds[path.nodeIds.length - 1])?.unitId;
  if (reached === undefined) return null;
  return assembleRoute(building, graph, origin, { type: "unit", unitId: reached }, path);
}

function sameRoutePoint(a: RoutePoint, b: RoutePoint): boolean {
  if (a.type === "unit" && b.type === "unit") return a.unitId === b.unitId;
  if (a.type === "anchor" && b.type === "anchor") return a.anchorId === b.anchorId;
  return false;
}

function emptyRoute(origin: RoutePoint, destination: RoutePoint): Route {
  return { origin, destination, nodeIds: [], legs: [], distance: 0, duration: 0, stepFree: true };
}

/** Graph nodes a route may start or end at: every door of a unit, or the anchor node. */
function endpointNodeIds(building: IndoorBuilding, graph: RouteGraph, point: RoutePoint): string[] {
  const ids =
    point.type === "anchor"
      ? [anchorNodeId(point.anchorId)]
      : building.openings.filter((o) => o.unitId === point.unitId).map((o) => openingNodeId(o.id));
  return ids.filter((id) => graph.nodes.has(id));
}

/** Multi-source, multi-target A* with a straight-line heuristic that ignores levels. */
function searchPath(graph: RouteGraph, sources: readonly string[], goals: readonly string[], options: RouteOptions): GraphPath | null {
  if (sources.length === 0 || goals.length === 0) return null;
  const goalSet = new Set(goals);
  const goalPositions = goals.map((id) => nodeOf(graph, id).position);
  const heuristic = (id: string) => Math.min(...goalPositions.map((p) => distance(p, nodeOf(graph, id).position)));

  const best = new Map<string, number>();
  const cameFrom = new Map<string, { nodeId: string; edge: GraphEdge }>();
  const closed = new Set<string>();
  const open = new BinaryHeap<string>();
  for (const id of sources) {
    best.set(id, 0);
    open.push(id, heuristic(id));
  }

  while (open.size > 0) {
    const current = open.pop() as string;
    if (closed.has(current)) continue;
    if (goalSet.has(current)) return reconstructPath(cameFrom, current);
    closed.add(current);
    const g = best.get(current) ?? 0;
    for (const edge of graph.adjacency.get(current) ?? []) {
      if (options.stepFree && !edge.stepFree) continue;
      const next = edge.from === current ? edge.to : edge.from;
      const candidate = g + edge.cost;
      if (closed.has(next) || candidate >= (best.get(next) ?? Infinity)) continue;
      best.set(next, candidate);
      cameFrom.set(next, { nodeId: current, edge });
      open.push(next, candidate + heuristic(next));
    }
  }
  return null;
}

function reconstructPath(cameFrom: ReadonlyMap<string, { nodeId: string; edge: GraphEdge }>, goal: string): GraphPath {
  const nodeIds = [goal];
  const edges: GraphEdge[] = [];
  for (let step = cameFrom.get(goal); step; step = cameFrom.get(step.nodeId)) {
    nodeIds.push(step.nodeId);
    edges.push(step.edge);
  }
  return { nodeIds: nodeIds.reverse(), edges: edges.reverse() };
}

function nodeOf(graph: RouteGraph, id: string): GraphNode {
  const node = graph.nodes.get(id);
  if (!node) throw new Error(`Unknown graph node "${id}"`);
  return node;
}

function assembleRoute(
  building: IndoorBuilding,
  graph: RouteGraph,
  origin: RoutePoint,
  destination: RoutePoint,
  path: GraphPath,
): Route {
  const ordinals = new Map(building.levels.map((level) => [level.id, level.ordinal]));
  const levelsSpanned = (i: number) =>
    Math.abs(levelOrdinal(ordinals, nodeOf(graph, path.nodeIds[i + 1]).levelId) - levelOrdinal(ordinals, nodeOf(graph, path.nodeIds[i]).levelId));
  return {
    origin,
    destination,
    nodeIds: path.nodeIds,
    legs: buildLegs(graph, path),
    distance: path.edges.reduce((sum, edge) => sum + edge.length, 0),
    duration: path.edges.reduce((sum, edge, i) => sum + edgeDuration(edge, levelsSpanned(i)), 0),
    stepFree: path.edges.every((edge) => edge.stepFree),
  };
}

function levelOrdinal(ordinals: ReadonlyMap<LevelId, number>, levelId: LevelId): number {
  return ordinals.get(levelId) ?? 0;
}

/**
 * Groups the path into legs: each run of walk edges becomes one walk leg and
 * each run of edges of the same connector becomes one connector leg, so a
 * climb over several floors on one staircase reads as a single leg.
 */
function buildLegs(graph: RouteGraph, path: GraphPath): RouteLeg[] {
  const legs: RouteLeg[] = [];
  let start = 0;
  while (start < path.edges.length) {
    const first = path.edges[start];
    let end = start + 1;
    while (end < path.edges.length && sameLegKind(first, path.edges[end])) end++;
    const nodes = path.nodeIds.slice(start, end + 1).map((id) => nodeOf(graph, id));
    const leg =
      first.kind === "walk"
        ? walkLeg(nodes, path.edges.slice(start, end))
        : connectorLeg(first.kind, first.connectorId ?? "", nodes);
    if (leg) legs.push(leg);
    start = end;
  }
  return legs;
}

function sameLegKind(a: GraphEdge, b: GraphEdge): boolean {
  return a.kind === "walk" ? b.kind === "walk" : a.connectorId === b.connectorId;
}

/** Null for a walk leg that covers no ground, e.g. a zero-length spur onto a connector. */
function walkLeg(nodes: readonly GraphNode[], edges: readonly GraphEdge[]): RouteLeg | null {
  const points: Vec2[] = simplifyPolyline(nodes.map((node) => node.position));
  if (points.length < 2) return null;
  return { type: "walk", levelId: nodes[0].levelId, points, length: edges.reduce((sum, edge) => sum + edge.length, 0) };
}

function connectorLeg(kind: ConnectorKind, connectorId: string, nodes: readonly GraphNode[]): RouteLeg {
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  return {
    type: "connector",
    connectorId,
    kind,
    fromLevelId: first.levelId,
    toLevelId: last.levelId,
    from: first.position,
    to: last.position,
  };
}
