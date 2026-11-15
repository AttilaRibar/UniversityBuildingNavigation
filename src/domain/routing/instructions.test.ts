import { describe, expect, it } from "vitest";
import type { Vec2 } from "../geometry/vec2";
import type { IndoorBuilding } from "../indoor/model";
import { anchor, makeBuilding, opening, rect, unit, walkway } from "./__fixtures__/builders";
import { demoBuilding, ENTRANCE_ID, WAYPOINT_ID } from "./__fixtures__/demo-building";
import { findRoute } from "./find-route";
import { buildRouteGraph } from "./graph";
import { buildSteps, classifyTurn } from "./instructions";
import type { RoutePoint, RouteStep } from "./types";

const entrance: RoutePoint = { type: "anchor", anchorId: ENTRANCE_ID };
const room = (unitId: string): RoutePoint => ({ type: "unit", unitId });

function stepsFor(building: IndoorBuilding, from: RoutePoint, to: RoutePoint, stepFree = false): RouteStep[] {
  const route = findRoute(building, buildRouteGraph(building), from, to, { stepFree });
  if (!route) throw new Error("expected a route");
  return buildSteps(building, route);
}

/** Compact view of a step list: "depart", turn directions, connector kinds, "arrive:<side>". */
function summary(steps: readonly RouteStep[]): string[] {
  return steps.map((step) => {
    switch (step.type) {
      case "depart":
        return `depart${step.exitTurn ? `:${step.exitTurn}` : ""}`;
      case "turn":
        return step.direction;
      case "connector":
        return `${step.kind}:${step.direction}`;
      case "arrive":
        return `arrive:${step.side}`;
    }
  });
}

/** A single corridor drawn along `points`, walked from its first to its last vertex. */
function corridorBuilding(points: readonly Vec2[]): IndoorBuilding {
  return makeBuilding({
    walkways: [walkway("w", "L0", points)],
    anchors: [anchor("start", "L0", points[0], true), anchor("end", "L0", points[points.length - 1])],
  });
}

function corridorSteps(points: readonly Vec2[]): string[] {
  return summary(stepsFor(corridorBuilding(points), { type: "anchor", anchorId: "start" }, { type: "anchor", anchorId: "end" }));
}

describe("classifyTurn", () => {
  it.each([
    [10, null],
    [-24, null],
    [30, "slight_left"],
    [-45, "slight_right"],
    [90, "left"],
    [-90, "right"],
    [130, "sharp_left"],
    [-150, "sharp_right"],
    [170, "u_turn"],
  ])("classifies %d degrees as %s", (angle, expected) => {
    expect(classifyTurn(angle)).toBe(expected);
  });
});

describe("buildSteps", () => {
  it("turns LEFT when walking +x and then +y (y is up)", () => {
    expect(
      corridorSteps([
        [0, 0],
        [10, 0],
        [10, 10],
      ]),
    ).toEqual(["depart", "left", "arrive:ahead"]);
    expect(
      corridorSteps([
        [0, 0],
        [10, 0],
        [10, -10],
      ]),
    ).toEqual(["depart", "right", "arrive:ahead"]);
  });

  it("describes a door-to-door route with exitTurn, corridor turn and arrival side", () => {
    // Out of s1 (door faces north) turn right to walk east, left at the corner, e1 is on the right.
    expect(summary(stepsFor(demoBuilding, room("u-0-s1"), room("u-0-e1"), true))).toEqual(["depart:right", "left", "arrive:right"]);
    // The reverse: out of e1 (facing west) turn left to walk south, right at the corner, s1 is on the left.
    expect(summary(stepsFor(demoBuilding, room("u-0-e1"), room("u-0-s1"), true))).toEqual(["depart:left", "right", "arrive:left"]);
  });

  it("gives step polylines and distances that partition the walked route", () => {
    const steps = stepsFor(demoBuilding, entrance, room("u-0-n1"));
    expect(steps).toEqual([
      {
        type: "depart",
        levelId: "lvl-0",
        points: [
          [20, -12],
          [20, 0],
        ],
        distance: 12,
        landmark: { unitId: "u-0-n2", side: "left" },
        exitTurn: null,
      },
      {
        type: "turn",
        levelId: "lvl-0",
        direction: "left",
        points: [
          [20, 0],
          [9, 0],
          [9, 1.5],
        ],
        distance: 12.5,
        landmark: { unitId: "u-0-n2", side: "right" },
      },
      { type: "arrive", levelId: "lvl-0", position: [9, 1.5], side: "right" },
    ]);
  });

  it("reports landmarks on the correct side and never the destination itself", () => {
    const [depart] = stepsFor(demoBuilding, { type: "anchor", anchorId: WAYPOINT_ID }, room("u-1-e1"));
    // Walking south along x = 40: the reception (west) is on the right.
    expect(depart).toMatchObject({ type: "depart", landmark: { unitId: "u-1-w1", side: "right" } });
    const toCafe = stepsFor(demoBuilding, entrance, room("u-0-n2"));
    expect(toCafe.every((step) => !("landmark" in step) || step.landmark === null)).toBe(true);
  });

  it("says the door is on the left when it is east of a southbound walker", () => {
    const steps = stepsFor(demoBuilding, { type: "anchor", anchorId: WAYPOINT_ID }, room("u-1-e1"));
    expect(summary(steps)).toEqual(["depart", "arrive:left"]);
  });

  it("emits one connector step per connector leg with its direction", () => {
    // L0: out of e1 left (south), right at the corner (west), left into the stairs at (36,0).
    // L2: out of the stairs north, right (east), left at the corner (north), e1 on the right.
    expect(summary(stepsFor(demoBuilding, room("u-0-e1"), room("u-2-e1")))).toEqual([
      "depart:left",
      "right",
      "left",
      "stairs:1",
      "depart",
      "right",
      "left",
      "arrive:right",
    ]);
    const down = stepsFor(demoBuilding, room("u-2-e1"), room("u-0-e1"), true).find((s) => s.type === "connector");
    expect(down).toMatchObject({ kind: "elevator", direction: -1, fromLevelId: "lvl-2", toLevelId: "lvl-0" });
  });

  it("folds two half-bends closer than 2.5 m into one turn", () => {
    expect(
      corridorSteps([
        [0, 0],
        [10, 0],
        [11, 1],
        [11, 10],
      ]),
    ).toEqual(["depart", "left", "arrive:ahead"]);
  });

  it("ignores a short jog whose bends cancel out", () => {
    expect(
      corridorSteps([
        [0, 0],
        [10, 0],
        [10, 1],
        [20, 1],
      ]),
    ).toEqual(["depart", "arrive:ahead"]);
  });

  it("keeps turns that are separated by a long segment", () => {
    expect(
      corridorSteps([
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ]),
    ).toEqual(["depart", "left", "left", "arrive:ahead"]);
  });

  it("arrives ahead at a door at the end of the corridor and exits straight on", () => {
    const building = makeBuilding({
      walkways: [
        walkway("w", "L0", [
          [0, 0],
          [10, 0],
        ]),
      ],
      units: [unit("west", "L0", rect(-6, -3, -1, 3)), unit("east", "L0", rect(11, -3, 16, 3))],
      openings: [opening("dw", "L0", "west", [-1, 0]), opening("de", "L0", "east", [11, 0])],
      anchors: [anchor("start", "L0", [5, 0], true)],
    });
    expect(summary(stepsFor(building, room("west"), room("east")))).toEqual(["depart", "arrive:ahead"]);
  });

  it("returns exactly one arrive step for a zero-length route", () => {
    expect(stepsFor(demoBuilding, room("u-1-n1"), room("u-1-n1"))).toEqual([
      { type: "arrive", levelId: "lvl-1", position: [9, 1.5], side: "ahead" },
    ]);
  });
});
