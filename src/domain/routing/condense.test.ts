import { describe, expect, it } from "vitest";
import { condenseSteps } from "./condense";
import type { RouteStep } from "./types";

const depart = (distance: number, levelId = "0"): RouteStep => ({
  type: "depart",
  levelId,
  points: [[0, 0], [distance, 0]],
  distance,
  landmark: null,
  exitTurn: null,
});
const turn = (direction: "left" | "right" | "slight_left", distance: number, levelId = "0"): RouteStep => ({
  type: "turn",
  levelId,
  direction,
  points: [[0, 0], [0, distance]],
  distance,
  landmark: null,
});
const stairs: RouteStep = { type: "connector", kind: "stairs", connectorId: "s", fromLevelId: "0", toLevelId: "1", direction: 1, from: [0, 0], to: [0, 0] };
const arrive: RouteStep = { type: "arrive", levelId: "1", position: [0, 0], side: "left" };

describe("condenseSteps", () => {
  it("folds a short approach to a connector into one step", () => {
    const result = condenseSteps([depart(1.8), turn("left", 3), turn("right", 1.9), stairs, depart(20, "1"), arrive]);
    expect(result.map((s) => s.type)).toEqual(["depart", "connector", "depart", "arrive"]);
    expect((result[0] as { distance: number }).distance).toBeCloseTo(6.7);
  });

  it("turns a few steps plus a turn into a depart with an exit side", () => {
    const result = condenseSteps([depart(0.4), turn("left", 30), arrive]);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ type: "depart", exitTurn: "left", distance: 30.4 });
  });

  it("joins a tiny last turn before a connector to the previous walk", () => {
    const result = condenseSteps([depart(20), turn("left", 0.4), stairs, arrive]);
    expect(result.map((s) => s.type)).toEqual(["depart", "connector", "arrive"]);
    expect(result[0]).toMatchObject({ distance: 20.4 });
  });

  it("keeps real turns on a long walk", () => {
    const steps = [depart(12), turn("left", 25), turn("right", 8), arrive];
    expect(condenseSteps(steps)).toEqual(steps);
  });

  it("keeps a short final turn before arriving", () => {
    const result = condenseSteps([depart(12), turn("left", 1), arrive]);
    expect(result.map((s) => s.type)).toEqual(["depart", "turn", "arrive"]);
  });
});
