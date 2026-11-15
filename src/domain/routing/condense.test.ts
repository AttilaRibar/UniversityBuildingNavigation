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
const turn = (direction: "left" | "right" | "slight_left" | "slight_right", distance: number, levelId = "0"): RouteStep => ({
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

  it("folds a short left-right sidestep into the walk around it", () => {
    const result = condenseSteps([depart(10), turn("left", 5), turn("right", 30), arrive]);
    expect(result.map((s) => s.type)).toEqual(["depart", "arrive"]);
    expect((result[0] as { distance: number }).distance).toBeCloseTo(45);
  });

  it("drops a short slight bend in front of a real turn but keeps the turn", () => {
    const result = condenseSteps([depart(30), turn("slight_left", 4), turn("right", 27), arrive]);
    expect(result.map((s) => s.type)).toEqual(["depart", "turn", "arrive"]);
    expect(result[1]).toMatchObject({ direction: "right", distance: 31 });
  });

  it("keeps two turns the same way", () => {
    const result = condenseSteps([depart(10), turn("left", 4), turn("left", 20), arrive]);
    expect(result.map((s) => s.type)).toEqual(["depart", "turn", "turn", "arrive"]);
  });
});
