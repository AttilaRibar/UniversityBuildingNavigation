import { distance, dot, projectOnSegment, segmentIntersection, sub, type Vec2 } from "../geometry/vec2";
import type { Connector, IndoorBuilding, Level, LevelId } from "../indoor/model";
import { connectorEdgeMetrics } from "./costs";
import type { GraphEdge, GraphNode, RouteGraph } from "./types";

/** Features farther than this from every walkway of their level are not connected. */
export const MAX_SNAP_DISTANCE = 6;

/** Coordinates are merged after rounding to this resolution (1 cm). */
const MERGE_RESOLUTION = 0.01;

export const walkwayNodeId = (levelId: LevelId, p: Vec2): string =>
  `w:${levelId}:${roundCm(p[0]).toFixed(2)}:${roundCm(p[1]).toFixed(2)}`;
export const openingNodeId = (openingId: string): string => `o:${openingId}`;
export const anchorNodeId = (anchorId: string): string => `a:${anchorId}`;
export const connectorNodeId = (connectorId: string, levelId: LevelId): string => `c:${connectorId}:${levelId}`;

/** Rounds to whole centimetres; `+ 0` turns -0 into 0 so ids never read "-0.00". */
function roundCm(v: number): number {
  return Math.round(v / MERGE_RESOLUTION) * MERGE_RESOLUTION + 0;
}

export interface WalkSegment {
  a: Vec2;
  b: Vec2;
  stepFree: boolean;
}

export interface SegmentSnap {
  point: Vec2;
  distance: number;
  segmentIndex: number;
}

/** All non-degenerate walkway segments of a level, in walkway order. */
export function walkSegmentsOfLevel(building: IndoorBuilding, levelId: LevelId): WalkSegment[] {
  const segments: WalkSegment[] = [];
  for (const walkway of building.walkways) {
    if (walkway.levelId !== levelId) continue;
    for (let i = 0; i + 1 < walkway.points.length; i++) {
      const a = walkway.points[i];
      const b = walkway.points[i + 1];
      if (distance(a, b) >= MERGE_RESOLUTION) segments.push({ a, b, stepFree: walkway.stepFree });
    }
  }
  return segments;
}

/** Nearest point on any segment; the earliest segment wins ties so snapping is deterministic. */
export function snapToSegments(segments: readonly WalkSegment[], p: Vec2): SegmentSnap | null {
  let best: SegmentSnap | null = null;
  for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex++) {
    const { a, b } = segments[segmentIndex];
    const projection = projectOnSegment(p, a, b);
    if (!best || projection.distance < best.distance) {
      best = { point: projection.point, distance: projection.distance, segmentIndex };
    }
  }
  return best;
}

/** Snaps `p` to the walkway network of its level, or null when it is too far or there is none. */
export function snapToLevel(building: IndoorBuilding, levelId: LevelId, p: Vec2): SegmentSnap | null {
  const snap = snapToSegments(walkSegmentsOfLevel(building, levelId), p);
  return snap && snap.distance <= MAX_SNAP_DISTANCE ? snap : null;
}

/** Accumulates nodes and de-duplicated undirected edges in insertion order. */
class GraphBuilder {
  private readonly nodes = new Map<string, GraphNode>();
  private readonly edges = new Map<string, GraphEdge>();

  addNode(node: GraphNode): string {
    if (!this.nodes.has(node.id)) this.nodes.set(node.id, node);
    return node.id;
  }

  node(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  addWalkNode(levelId: LevelId, p: Vec2): string {
    const id = walkwayNodeId(levelId, p);
    return this.addNode({ id, levelId, position: [roundCm(p[0]), roundCm(p[1])], kind: "walkway" });
  }

  /** Adds a walk edge; when two walkways overlap, the edge is step-free if either of them is. */
  addWalkEdge(from: string, to: string, stepFree: boolean): void {
    if (from === to) return;
    const key = from < to ? `${from}|${to}|walk` : `${to}|${from}|walk`;
    const existing = this.edges.get(key);
    if (existing) {
      existing.stepFree ||= stepFree;
      return;
    }
    const length = distance(this.position(from), this.position(to));
    this.edges.set(key, { from, to, kind: "walk", length, cost: length, stepFree });
  }

  addConnectorEdge(edge: GraphEdge): void {
    this.edges.set(`${edge.from}|${edge.to}|${edge.connectorId}`, edge);
  }

  build(): RouteGraph {
    const adjacency = new Map<string, GraphEdge[]>();
    for (const id of this.nodes.keys()) adjacency.set(id, []);
    for (const edge of this.edges.values()) {
      adjacency.get(edge.from)?.push(edge);
      adjacency.get(edge.to)?.push(edge);
    }
    return { nodes: this.nodes, adjacency };
  }

  private position(id: string): Vec2 {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`Graph node "${id}" was used before it was added`);
    return node.position;
  }
}

/** A typed feature node waiting to be joined to the walkway network by a spur. */
interface PendingFeature {
  node: GraphNode;
  snap: SegmentSnap;
}

/**
 * Builds the routing graph: walkway polylines split at every vertex, junction
 * and feature projection, plus typed nodes for doors, connector stops and
 * anchors joined to the network by short spurs, plus connector edges.
 * Features that cannot be snapped are skipped; `validateBuilding` reports them.
 */
export function buildRouteGraph(building: IndoorBuilding): RouteGraph {
  const builder = new GraphBuilder();
  for (const level of building.levels) addLevel(builder, building, level.id);
  const ordinals = new Map(building.levels.map((level) => [level.id, level.ordinal]));
  for (const connector of building.connectors) addConnectorEdges(builder, connector, ordinals);
  return builder.build();
}

function addLevel(builder: GraphBuilder, building: IndoorBuilding, levelId: LevelId): void {
  const segments = walkSegmentsOfLevel(building, levelId);
  if (segments.length === 0) return;
  const splits = junctionSplits(segments);
  const features = featureNodesOfLevel(building, levelId)
    .map((node) => ({ node, snap: snapToSegments(segments, node.position) }))
    .filter((f): f is PendingFeature => f.snap !== null && f.snap.distance <= MAX_SNAP_DISTANCE);
  for (const feature of features) splits[feature.snap.segmentIndex].push(feature.snap.point);

  segments.forEach((segment, index) => {
    const ids = sortAlong(segment, splits[index]).map((p) => builder.addWalkNode(levelId, p));
    for (let i = 1; i < ids.length; i++) builder.addWalkEdge(ids[i - 1], ids[i], segment.stepFree);
  });
  for (const { node, snap } of features) {
    builder.addNode(node);
    builder.addWalkEdge(node.id, walkwayNodeId(levelId, snap.point), true);
  }
}

/**
 * Split points of every segment: its endpoints, crossings with other segments,
 * and vertices of other segments lying on it (T-junctions, collinear touches).
 */
function junctionSplits(segments: readonly WalkSegment[]): Vec2[][] {
  const splits = segments.map((s) => [s.a, s.b]);
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const s = segments[i];
      const t = segments[j];
      const crossing = segmentIntersection(s.a, s.b, t.a, t.b);
      if (crossing) {
        splits[i].push(crossing);
        splits[j].push(crossing);
      }
      for (const p of [t.a, t.b]) if (liesOn(p, s)) splits[i].push(p);
      for (const p of [s.a, s.b]) if (liesOn(p, t)) splits[j].push(p);
    }
  }
  return splits;
}

function liesOn(p: Vec2, segment: WalkSegment): boolean {
  return projectOnSegment(p, segment.a, segment.b).distance < MERGE_RESOLUTION;
}

function sortAlong(segment: WalkSegment, points: readonly Vec2[]): Vec2[] {
  const direction = sub(segment.b, segment.a);
  const param = (p: Vec2) => dot(sub(p, segment.a), direction);
  return [...points].sort((p, q) => param(p) - param(q));
}

/** Typed nodes for the doors, connector stops and anchors of a level, in data order. */
function featureNodesOfLevel(building: IndoorBuilding, levelId: LevelId): GraphNode[] {
  const nodes: GraphNode[] = [];
  for (const opening of building.openings) {
    if (opening.levelId !== levelId) continue;
    nodes.push({ id: openingNodeId(opening.id), levelId, position: opening.position, kind: "opening", unitId: opening.unitId });
  }
  for (const connector of building.connectors) {
    for (const stop of connector.stops) {
      if (stop.levelId !== levelId) continue;
      const id = connectorNodeId(connector.id, levelId);
      nodes.push({ id, levelId, position: stop.position, kind: "connector", connectorId: connector.id });
    }
  }
  for (const anchor of building.anchors) {
    if (anchor.levelId !== levelId) continue;
    nodes.push({ id: anchorNodeId(anchor.id), levelId, position: anchor.position, kind: "anchor", anchorId: anchor.id });
  }
  return nodes;
}

/** Stairs and ramps link consecutive stops; an elevator links every pair of stops. */
function addConnectorEdges(builder: GraphBuilder, connector: Connector, ordinals: ReadonlyMap<LevelId, Level["ordinal"]>): void {
  const stops = connector.stops
    .map((stop) => builder.node(connectorNodeId(connector.id, stop.levelId)))
    .filter((node): node is GraphNode => node !== undefined);
  for (let i = 0; i < stops.length; i++) {
    const lastPartner = connector.kind === "elevator" ? stops.length - 1 : Math.min(i + 1, stops.length - 1);
    for (let j = i + 1; j <= lastPartner; j++) {
      const from = stops[i];
      const to = stops[j];
      if (from.levelId === to.levelId) continue;
      const levels = Math.abs((ordinals.get(to.levelId) ?? 0) - (ordinals.get(from.levelId) ?? 0));
      const metrics = connectorEdgeMetrics(connector.kind, distance(from.position, to.position), levels);
      builder.addConnectorEdge({
        from: from.id,
        to: to.id,
        kind: connector.kind,
        ...metrics,
        stepFree: connector.kind !== "stairs",
        connectorId: connector.id,
      });
    }
  }
}
