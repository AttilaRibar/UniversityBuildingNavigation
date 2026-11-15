import type { ConnectorKind } from "../indoor/model";
import type { GraphEdge } from "./types";

/**
 * Cost model of the router. Costs are metre-equivalents: walking one metre on
 * the flat costs 1. Every edge cost must stay >= the planar distance between
 * its nodes, otherwise the straight-line A* heuristic stops being admissible.
 */

/** Average indoor walking speed, metres per second. */
export const WALKING_SPEED = 1.3;

/** Extra metre-equivalents for climbing one level on stairs. */
export const STAIRS_COST_PER_LEVEL = 18;
/** Extra seconds spent per level on stairs. */
export const STAIRS_SECONDS_PER_LEVEL = 12;

/** Fixed penalty for calling and boarding an elevator, metre-equivalents. */
export const ELEVATOR_BASE_COST = 30;
export const ELEVATOR_COST_PER_LEVEL = 5;
/** Average waiting plus boarding time of an elevator ride, seconds. */
export const ELEVATOR_BASE_SECONDS = 35;
export const ELEVATOR_SECONDS_PER_LEVEL = 6;

/** Ramps are slower than flat floor; their planar length is multiplied by this. */
export const RAMP_COST_FACTOR = 1.2;

export interface ConnectorEdgeMetrics {
  /** Walked metres (0 for an elevator ride). */
  length: number;
  cost: number;
}

/** Length and cost of one connector edge spanning `levels` levels over `planar` metres. */
export function connectorEdgeMetrics(kind: ConnectorKind, planar: number, levels: number): ConnectorEdgeMetrics {
  switch (kind) {
    case "stairs":
      return { length: planar, cost: planar + STAIRS_COST_PER_LEVEL * levels };
    case "ramp":
      return { length: planar, cost: planar * RAMP_COST_FACTOR };
    case "elevator":
      // The max keeps the heuristic admissible even for oddly drawn shafts.
      return { length: 0, cost: Math.max(planar, ELEVATOR_BASE_COST + ELEVATOR_COST_PER_LEVEL * levels) };
  }
}

/** Rough time in seconds to traverse `edge`, which spans `levels` levels. */
export function edgeDuration(edge: GraphEdge, levels: number): number {
  switch (edge.kind) {
    case "walk":
    case "ramp":
      return edge.length / WALKING_SPEED;
    case "stairs":
      return edge.length / WALKING_SPEED + STAIRS_SECONDS_PER_LEVEL * levels;
    case "elevator":
      return ELEVATOR_BASE_SECONDS + ELEVATOR_SECONDS_PER_LEVEL * levels;
  }
}
