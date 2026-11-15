import type { RouteStep } from "./types";

type WalkStep = Extract<RouteStep, { type: "depart" | "turn" }>;

/** A walk shorter than this is a shuffle, not something worth its own card. */
const SHORT_WALK = 3;
/** A turn followed this soon by the opposite turn is a sidestep, not a change of direction. */
const JOG = 6;
/** Getting to a staircase or lift that is this close is a single "go to the lift" card. */
const APPROACH_RUN = 9;

const isWalk = (step: RouteStep | undefined): step is WalkStep => step?.type === "depart" || step?.type === "turn";

function merge(first: WalkStep, rest: readonly WalkStep[]): WalkStep {
  const points = [...first.points];
  let distance = first.distance;
  for (const step of rest) {
    points.push(...step.points.slice(1));
    distance += step.distance;
  }
  return { ...first, points, distance, landmark: first.landmark ?? rest.find((s) => s.landmark)?.landmark ?? null };
}

type Turn = Extract<RouteStep, { type: "turn" }>;

const isSlight = (turn: Turn) => turn.direction.startsWith("slight");
const isJogPair = (a: Turn, b: Turn) =>
  (a.direction === "left" && b.direction === "right") ||
  (a.direction === "right" && b.direction === "left") ||
  (a.direction === "slight_left" && b.direction === "slight_right") ||
  (a.direction === "slight_right" && b.direction === "slight_left");

/**
 * Removes sidesteps: a short turn immediately undone by the opposite turn is
 * just the corridor shifting sideways, and a short slight bend right before a
 * real turn adds nothing to it.
 */
function foldJogs(run: readonly WalkStep[]): WalkStep[] {
  const out: WalkStep[] = [run[0]];
  for (let i = 1; i < run.length; i++) {
    const step = run[i];
    const next = run[i + 1];
    if (step.type === "turn" && step.distance < JOG && next?.type === "turn") {
      if (isJogPair(step, next)) {
        out[out.length - 1] = merge(out[out.length - 1], [step, next]);
        i++;
        continue;
      }
      if (isSlight(step)) {
        out.push({ ...next, points: [...step.points, ...next.points.slice(1)], distance: step.distance + next.distance, landmark: step.landmark ?? next.landmark });
        i++;
        continue;
      }
    }
    out.push(step);
  }
  return out;
}

const sideOf = (direction: Extract<RouteStep, { type: "turn" }>["direction"]): "left" | "right" | null =>
  direction === "u_turn" ? null : direction.endsWith("left") ? "left" : "right";

/**
 * Turns the geometrically exact step list into the cards a person wants to read.
 *
 * `buildSteps` reports every real change of direction, which near doors,
 * stairs and lifts produces cards like "turn left, 0.4 m". Here those are
 * folded away:
 *  - a short run of walking that ends at a staircase or lift becomes one step;
 *  - a few steps out of a lift followed by a turn become "leave and turn left";
 *  - a tiny last turn before a connector joins the walk before it;
 *  - a short left-right sidestep disappears into the walk it interrupts.
 */
export function condenseSteps(steps: readonly RouteStep[]): RouteStep[] {
  const out: RouteStep[] = [];
  let i = 0;
  while (i < steps.length) {
    const step = steps[i];
    if (!isWalk(step)) {
      out.push(step);
      i++;
      continue;
    }
    // Collect the whole walk on this level up to the next connector or arrival.
    let end = i;
    while (isWalk(steps[end + 1])) end++;
    const run = steps.slice(i, end + 1) as WalkStep[];
    const endsAtConnector = steps[end + 1]?.type === "connector";
    out.push(...condenseRun(run, endsAtConnector));
    i = end + 1;
  }
  return out;
}

function condenseRun(run: readonly WalkStep[], endsAtConnector: boolean): WalkStep[] {
  const total = run.reduce((sum, s) => sum + s.distance, 0);
  if (endsAtConnector && total < APPROACH_RUN) return [merge(run[0], run.slice(1))];

  const result = foldJogs(run);
  // Tiny last leg before a connector: part of the walk that leads to it.
  if (endsAtConnector && result.length > 1 && result[result.length - 1].distance < SHORT_WALK) {
    const last = result.pop()!;
    result[result.length - 1] = merge(result[result.length - 1], [last]);
  }
  // A couple of steps, then a turn: "leave and turn left".
  const [first, second] = result;
  if (first.type === "depart" && first.distance < SHORT_WALK && second?.type === "turn") {
    const merged = merge(first, [second]);
    result.splice(0, 2, { ...merged, type: "depart", exitTurn: first.exitTurn ?? sideOf(second.direction) });
  }
  return result;
}
