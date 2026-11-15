import { centroid } from "../geometry/polygon";
import { cross, distance, polylineLength, signedAngleDeg, sub, type Vec2 } from "../geometry/vec2";
import type { IndoorBuilding, LevelId } from "../indoor/model";
import { snapToLevel } from "./graph";
import { projectOnPolyline } from "./polyline";
import type { RelativeSide, Route, RouteLeg, RouteStep, StepLandmark, TurnDirection } from "./types";

/** Below this absolute angle the walker simply continues; no step is emitted. */
const STRAIGHT_LIMIT_DEG = 25;
const SLIGHT_LIMIT_DEG = 60;
const NORMAL_LIMIT_DEG = 120;
const SHARP_LIMIT_DEG = 160;
/** Turns separated by a shorter segment are folded into one, hiding geometric noise. */
const MIN_TURN_SEPARATION = 2.5;
/** A destination door within this angle of the walking direction is "ahead". */
const AHEAD_LIMIT_DEG = 30;
/** Landmarks whose centroid is farther than this from a step are not mentioned. */
const LANDMARK_RADIUS = 14;
/** Tolerance when matching a polyline vertex to a recomputed spur end (graph nodes are rounded to 1 cm). */
const SPUR_MATCH_TOLERANCE = 0.02;

type WalkLeg = Extract<RouteLeg, { type: "walk" }>;
type ConnectorLeg = Extract<RouteLeg, { type: "connector" }>;
type TurnStepDirection = Exclude<TurnDirection, "straight">;

/** What the step builder needs to know about the leg's place in the route. */
interface WalkContext {
  /** The leg starts at the origin door, so its first segment may be a door spur. */
  startsAtDoor: boolean;
  /** The leg ends at the destination door, so its last segment may be a door spur. */
  endsAtDoor: boolean;
  /** Origin and destination units, never reported as landmarks. */
  excludedUnitIds: ReadonlySet<string>;
}

/** Turns a route into instruction cards: depart/turn per walk leg, one card per connector leg, one arrival. */
export function buildSteps(building: IndoorBuilding, route: Route): RouteStep[] {
  const excludedUnitIds = new Set(
    [route.origin, route.destination].flatMap((p) => (p.type === "unit" ? [p.unitId] : [])),
  );
  const lastIndex = route.legs.length - 1;
  const steps = route.legs.flatMap((leg, index): RouteStep[] =>
    leg.type === "connector"
      ? [connectorStep(building, leg)]
      : walkSteps(building, leg, {
          startsAtDoor: index === 0 && route.origin.type === "unit",
          endsAtDoor: index === lastIndex && route.destination.type === "unit",
          excludedUnitIds,
        }),
  );
  return [...steps, arriveStep(building, route)];
}

function connectorStep(building: IndoorBuilding, leg: ConnectorLeg): RouteStep {
  const ordinal = (id: LevelId) => building.levels.find((level) => level.id === id)?.ordinal ?? 0;
  return {
    type: "connector",
    kind: leg.kind,
    connectorId: leg.connectorId,
    fromLevelId: leg.fromLevelId,
    toLevelId: leg.toLevelId,
    direction: ordinal(leg.toLevelId) >= ordinal(leg.fromLevelId) ? 1 : -1,
    from: leg.from,
    to: leg.to,
  };
}

function walkSteps(building: IndoorBuilding, leg: WalkLeg, context: WalkContext): RouteStep[] {
  const points = leg.points;
  const leadingSpur = context.startsAtDoor && hasDoorSpur(building, leg.levelId, points[0], points[1]);
  const trailingSpur =
    context.endsAtDoor && hasDoorSpur(building, leg.levelId, points[points.length - 1], points[points.length - 2]);
  // Vertices joining a door spur to the corridor are described by exitTurn / arrive.side, not by turns.
  const firstVertex = leadingSpur ? 2 : 1;
  const lastVertex = points.length - (trailingSpur ? 3 : 2);
  const turns = detectTurns(points, firstVertex, lastVertex);
  const landmark = (from: number, to: number) =>
    findLandmark(building, leg.levelId, points.slice(from, to + 1), context.excludedUnitIds);

  const boundaries = [0, ...turns.map((turn) => turn.vertex), points.length - 1];
  const stepPoints = (i: number) => points.slice(boundaries[i], boundaries[i + 1] + 1);
  const depart: RouteStep = {
    type: "depart",
    levelId: leg.levelId,
    points: stepPoints(0),
    distance: polylineLength(stepPoints(0)),
    landmark: landmark(boundaries[0], boundaries[1]),
    exitTurn: leadingSpur ? exitTurnAt(points, trailingSpur) : null,
  };
  const turnSteps = turns.map((turn, i): RouteStep => ({
    type: "turn",
    levelId: leg.levelId,
    direction: turn.direction,
    points: stepPoints(i + 1),
    distance: polylineLength(stepPoints(i + 1)),
    landmark: landmark(boundaries[i + 1], boundaries[i + 2]),
  }));
  return [depart, ...turnSteps];
}

/**
 * True when `next` is where the door at `door` meets the walkway network, i.e.
 * the door spur survived polyline simplification as a segment of its own.
 */
function hasDoorSpur(building: IndoorBuilding, levelId: LevelId, door: Vec2, next: Vec2 | undefined): boolean {
  if (!next || distance(door, next) < SPUR_MATCH_TOLERANCE) return false;
  const snap = snapToLevel(building, levelId, door);
  return snap !== null && distance(snap.point, next) < SPUR_MATCH_TOLERANCE;
}

/**
 * Which way to turn at the end of the leading door spur (vertex 1). Needs a
 * corridor segment after the spur that is not itself the destination spur.
 */
function exitTurnAt(points: readonly Vec2[], trailingSpur: boolean): "left" | "right" | null {
  if (points.length < (trailingSpur ? 4 : 3)) return null;
  const angle = vertexAngle(points, 1);
  if (Math.abs(angle) < STRAIGHT_LIMIT_DEG) return null;
  return angle > 0 ? "left" : "right";
}

function vertexAngle(points: readonly Vec2[], i: number): number {
  return signedAngleDeg(sub(points[i], points[i - 1]), sub(points[i + 1], points[i]));
}

interface Turn {
  /** Index of the polyline vertex where the turn step begins. */
  vertex: number;
  direction: TurnStepDirection;
}

/**
 * Finds turns at vertices `first..last`. Vertices joined by segments shorter
 * than MIN_TURN_SEPARATION form one cluster whose angles are summed, so a
 * slight jog in a corridor produces no step and a bend drawn as two
 * half-bends produces a single turn.
 */
function detectTurns(points: readonly Vec2[], first: number, last: number): Turn[] {
  const turns: Turn[] = [];
  let i = first;
  while (i <= last) {
    const start = i;
    let angle = vertexAngle(points, i);
    while (i + 1 <= last && distance(points[i], points[i + 1]) < MIN_TURN_SEPARATION) {
      i++;
      angle += vertexAngle(points, i);
    }
    const direction = classifyTurn(angle);
    if (direction) turns.push({ vertex: start, direction });
    i++;
  }
  return turns;
}

/** Maps a signed angle (positive = left) to a turn direction, or null when it is straight on. */
export function classifyTurn(angleDeg: number): TurnStepDirection | null {
  const magnitude = Math.abs(angleDeg);
  if (magnitude < STRAIGHT_LIMIT_DEG) return null;
  if (magnitude > SHARP_LIMIT_DEG) return "u_turn";
  const side = angleDeg > 0 ? "left" : "right";
  if (magnitude < SLIGHT_LIMIT_DEG) return `slight_${side}`;
  if (magnitude <= NORMAL_LIMIT_DEG) return side;
  return `sharp_${side}`;
}

/** The closest landmark unit of the level whose centroid lies within LANDMARK_RADIUS of the step. */
function findLandmark(
  building: IndoorBuilding,
  levelId: LevelId,
  points: readonly Vec2[],
  excludedUnitIds: ReadonlySet<string>,
): StepLandmark | null {
  let best: { landmark: StepLandmark; distance: number } | null = null;
  for (const unit of building.units) {
    if (!unit.landmark || unit.levelId !== levelId || excludedUnitIds.has(unit.id)) continue;
    const center = centroid(unit.polygon);
    const projection = projectOnPolyline(points, center);
    if (!projection || projection.distance > LANDMARK_RADIUS) continue;
    if (best && projection.distance >= best.distance) continue;
    const direction = sub(points[projection.segmentIndex + 1], points[projection.segmentIndex]);
    const side = cross(direction, sub(center, projection.point)) > 0 ? "left" : "right";
    best = { landmark: { unitId: unit.id, side }, distance: projection.distance };
  }
  return best?.landmark ?? null;
}

function arriveStep(building: IndoorBuilding, route: Route): RouteStep {
  const lastLeg = route.legs[route.legs.length - 1];
  if (!lastLeg) return { type: "arrive", ...destinationLocation(building, route), side: "ahead" };
  if (lastLeg.type === "connector") {
    return { type: "arrive", levelId: lastLeg.toLevelId, position: lastLeg.to, side: "ahead" };
  }
  const points = lastLeg.points;
  const door = points[points.length - 1];
  return { type: "arrive", levelId: lastLeg.levelId, position: door, side: arrivalSide(building, route, lastLeg) };
}

/**
 * Side of the destination door relative to the last real (non-spur) segment.
 * Anchors, and doors reached straight on, are "ahead".
 */
function arrivalSide(building: IndoorBuilding, route: Route, leg: WalkLeg): RelativeSide {
  const points = leg.points;
  const n = points.length;
  if (route.destination.type !== "unit" || n < 3) return "ahead";
  if (!hasDoorSpur(building, leg.levelId, points[n - 1], points[n - 2])) return "ahead";
  const angle = signedAngleDeg(sub(points[n - 2], points[n - 3]), sub(points[n - 1], points[n - 2]));
  if (Math.abs(angle) <= AHEAD_LIMIT_DEG) return "ahead";
  return angle > 0 ? "left" : "right";
}

/** Where a route with no legs arrives: the first door of the unit, or the anchor. */
function destinationLocation(building: IndoorBuilding, route: Route): { levelId: LevelId; position: Vec2 } {
  const destination = route.destination;
  if (destination.type === "anchor") {
    const anchor = building.anchors.find((a) => a.id === destination.anchorId);
    if (anchor) return { levelId: anchor.levelId, position: anchor.position };
    throw new Error(`Unknown anchor "${destination.anchorId}"`);
  }
  const unit = building.units.find((u) => u.id === destination.unitId);
  if (!unit) throw new Error(`Unknown unit "${destination.unitId}"`);
  const door = building.openings.find((o) => o.unitId === unit.id);
  return { levelId: unit.levelId, position: door?.position ?? centroid(unit.polygon) };
}
