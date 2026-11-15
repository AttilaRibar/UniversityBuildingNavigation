import type { Vec2 } from "../geometry/vec2";
import type { ConnectorKind, LevelId } from "../indoor/model";

export type NodeKind = "walkway" | "opening" | "connector" | "anchor";

export interface GraphNode {
  id: string;
  levelId: LevelId;
  position: Vec2;
  kind: NodeKind;
  /** Set for `opening` nodes: the unit this door belongs to. */
  unitId?: string;
  /** Set for `connector` nodes. */
  connectorId?: string;
  /** Set for `anchor` nodes. */
  anchorId?: string;
}

export type EdgeKind = "walk" | ConnectorKind;

export interface GraphEdge {
  from: string;
  to: string;
  kind: EdgeKind;
  /** Physical length walked along the edge, metres (0 for elevator rides). */
  length: number;
  /** Search cost in metre-equivalents; always >= the planar distance between the nodes. */
  cost: number;
  stepFree: boolean;
  connectorId?: string;
}

/** Undirected routing graph; every edge is listed under both of its nodes. */
export interface RouteGraph {
  nodes: ReadonlyMap<string, GraphNode>;
  adjacency: ReadonlyMap<string, readonly GraphEdge[]>;
}

/** Where a route starts or ends. */
export type RoutePoint =
  | { type: "unit"; unitId: string }
  | { type: "anchor"; anchorId: string };

export interface RouteOptions {
  /** Avoid stairs and any walkway that is not step-free. */
  stepFree: boolean;
}

/** A continuous stretch of the route on one level, or one ride/climb between levels. */
export type RouteLeg =
  | {
      type: "walk";
      levelId: LevelId;
      /** Polyline with collinear points removed. */
      points: readonly Vec2[];
      length: number;
    }
  | {
      type: "connector";
      connectorId: string;
      kind: ConnectorKind;
      fromLevelId: LevelId;
      toLevelId: LevelId;
      from: Vec2;
      to: Vec2;
    };

export interface Route {
  origin: RoutePoint;
  destination: RoutePoint;
  /** Graph node ids from origin to destination. */
  nodeIds: readonly string[];
  legs: readonly RouteLeg[];
  /** Total walked distance in metres (connector rides excluded). */
  distance: number;
  /** Rough walking time in seconds, including stairs and lift waiting. */
  duration: number;
  stepFree: boolean;
}

export type TurnDirection = "straight" | "slight_left" | "left" | "sharp_left" | "slight_right" | "right" | "sharp_right" | "u_turn";

export type RelativeSide = "left" | "right" | "ahead";

/**
 * One instruction card. Steps are structured data; the presentation layer turns
 * them into Hungarian or English sentences.
 */
export type RouteStep =
  | {
      type: "depart";
      levelId: LevelId;
      /** Polyline covered by this step, for highlighting and camera framing. */
      points: readonly Vec2[];
      distance: number;
      landmark: StepLandmark | null;
      /**
       * Which way to turn after stepping out of the origin door onto the corridor;
       * null when the route does not start at a unit or simply goes straight on.
       */
      exitTurn: "left" | "right" | null;
    }
  | {
      type: "turn";
      levelId: LevelId;
      direction: Exclude<TurnDirection, "straight">;
      points: readonly Vec2[];
      distance: number;
      landmark: StepLandmark | null;
    }
  | {
      type: "connector";
      kind: ConnectorKind;
      connectorId: string;
      fromLevelId: LevelId;
      toLevelId: LevelId;
      /** +1 going up, -1 going down. */
      direction: 1 | -1;
      from: Vec2;
      to: Vec2;
    }
  | {
      type: "arrive";
      levelId: LevelId;
      position: Vec2;
      side: RelativeSide;
    };

/** A recognisable unit passed during a step, and the side it is on. */
export interface StepLandmark {
  unitId: string;
  side: "left" | "right";
}
