import { describe, expect, it } from "vitest";
import type { IndoorBuilding } from "../indoor/model";
import { anchor, level, makeBuilding, opening, rect, unit, walkway } from "./__fixtures__/builders";
import { demoBuilding, ELEVATOR_ID, STAIRS_ID } from "./__fixtures__/demo-building";
import { validateBuilding, type ValidationIssue } from "./validate";

const codes = (issues: readonly ValidationIssue[]) => issues.map((issue) => `${issue.severity}:${issue.code}`);

/** One corridor with a single office, valid as is. */
function smallBuilding(overrides: Partial<IndoorBuilding> = {}): IndoorBuilding {
  return makeBuilding({
    units: [unit("office", "L0", rect(4, 1, 8, 5))],
    openings: [opening("d-office", "L0", "office", [6, 1])],
    walkways: [
      walkway("corridor", "L0", [
        [0, 0],
        [10, 0],
      ]),
    ],
    anchors: [anchor("entrance", "L0", [0, 0], true)],
    ...overrides,
  });
}

describe("validateBuilding", () => {
  it("accepts the demo building and the small building", () => {
    expect(validateBuilding(demoBuilding)).toEqual([]);
    expect(validateBuilding(smallBuilding())).toEqual([]);
  });

  it("reports duplicate ids once", () => {
    const building = smallBuilding({ walkways: [...smallBuilding().walkways, walkway("office", "L0", [[0, 0], [0, 5]])] });
    expect(validateBuilding(building)).toEqual([
      { severity: "error", code: "duplicate_id", message: expect.any(String), featureId: "office" },
    ]);
  });

  it("reports level ordinals that are not consecutive from 0", () => {
    const building = smallBuilding({ levels: [level("L0", 0, "F"), level("L2", 2, "2")] });
    expect(codes(validateBuilding(building))).toEqual(["error:level_ordinals"]);
  });

  it("reports references to unknown levels and units", () => {
    const building = smallBuilding({
      openings: [opening("d-office", "L0", "office", [6, 1]), opening("d-ghost", "L0", "ghost", [2, 1])],
      anchors: [anchor("entrance", "L0", [0, 0], true), anchor("lost", "L9", [0, 0])],
    });
    const issues = validateBuilding(building);
    expect(issues).toContainEqual(expect.objectContaining({ code: "unknown_unit", featureId: "d-ghost" }));
    expect(issues).toContainEqual(expect.objectContaining({ code: "unknown_level", featureId: "lost" }));
  });

  it("reports a destination unit without an opening, but not a service room", () => {
    const building = smallBuilding({
      units: [...smallBuilding().units, unit("hall", "L0", rect(0, -5, 4, -1), { category: "lecture_hall" }), unit("shaft", "L0", rect(8, -5, 10, -1), { category: "service" })],
    });
    expect(validateBuilding(building)).toEqual([expect.objectContaining({ code: "destination_without_opening", featureId: "hall" })]);
  });

  it("requires exactly one default anchor", () => {
    expect(codes(validateBuilding(smallBuilding({ anchors: [anchor("a", "L0", [0, 0])] })))).toEqual(["error:default_anchor"]);
    const twoDefaults = smallBuilding({ anchors: [anchor("a", "L0", [0, 0], true), anchor("b", "L0", [10, 0], true)] });
    expect(codes(validateBuilding(twoDefaults))).toEqual(["error:default_anchor"]);
  });

  it("checks connector stops", () => {
    const [elevator, stairs] = demoBuilding.connectors;
    const building = {
      ...demoBuilding,
      connectors: [
        { ...elevator, stops: elevator.stops.slice(0, 1) },
        { ...stairs, stops: [...stairs.stops].reverse() },
      ],
    };
    const issues = validateBuilding(building);
    expect(issues).toContainEqual(expect.objectContaining({ code: "connector_stops", featureId: ELEVATOR_ID }));
    expect(issues).toContainEqual(expect.objectContaining({ code: "connector_order", featureId: STAIRS_ID }));
  });

  it("reports a level that has openings but no walkways", () => {
    const building = smallBuilding({
      levels: [level("L0", 0, "F"), level("L1", 1, "1")],
      units: [...smallBuilding().units, unit("attic", "L1", rect(0, 0, 4, 4), { category: "service" })],
      openings: [...smallBuilding().openings, opening("d-attic", "L1", "attic", [2, 0])],
    });
    expect(codes(validateBuilding(building))).toEqual(["error:level_without_walkways", "error:not_snapped"]);
  });

  it("reports features too far from any walkway", () => {
    const building = smallBuilding({ anchors: [anchor("entrance", "L0", [0, 0], true), anchor("garden", "L0", [5, 7])] });
    expect(validateBuilding(building)).toEqual([expect.objectContaining({ code: "not_snapped", featureId: "garden" })]);
  });

  it("reports destinations that cannot be reached from the default anchor", () => {
    const building = smallBuilding({
      units: [...smallBuilding().units, unit("island", "L0", rect(4, 21, 8, 25))],
      openings: [...smallBuilding().openings, opening("d-island", "L0", "island", [6, 21])],
      walkways: [...smallBuilding().walkways, walkway("cut-off", "L0", [[0, 20], [10, 20]])],
    });
    expect(validateBuilding(building)).toEqual([expect.objectContaining({ severity: "error", code: "unreachable", featureId: "island" })]);
  });

  it("warns about destinations that cannot be reached step-free", () => {
    const building = smallBuilding({
      units: [...smallBuilding().units, unit("upper-office", "L0", rect(14, 1, 18, 5))],
      openings: [...smallBuilding().openings, opening("d-upper", "L0", "upper-office", [16, 1])],
      walkways: [...smallBuilding().walkways, walkway("steps", "L0", [[10, 0], [20, 0]], false)],
    });
    expect(validateBuilding(building)).toEqual([
      { severity: "warning", code: "not_step_free", message: expect.any(String), featureId: "upper-office" },
    ]);
  });
});
