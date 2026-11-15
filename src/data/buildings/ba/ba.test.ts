import { describe, expect, it } from "vitest";
import { DESTINATION_CATEGORIES } from "@/domain/indoor/model";
import { buildRouteGraph, buildSteps, condenseSteps, findRoute, validateBuilding } from "@/domain/routing";
import { building } from "./index";

/** Guards the shipped data: a broken edit must fail here, not in a student's hand. */
describe("building BA data", () => {
  const graph = buildRouteGraph(building);
  const from = { type: "anchor", anchorId: "main-entrance" } as const;

  it("passes validation without errors", () => {
    expect(validateBuilding(building).filter((issue) => issue.severity === "error")).toEqual([]);
  });

  it("has the levels shown on the floor directory signs", () => {
    expect(building.levels.map((l) => l.id)).toEqual(["A", "F", "1", "2", "3", "4"]);
  });

  it("contains the rooms printed on the signs", () => {
    const refs = new Set(building.units.map((u) => u.ref));
    for (const ref of ["F.01", "F.09", "1.32", "2.02", "2.20", "2.36", "3.01", "3.28", "4.01", "4.28"]) expect(refs, ref).toContain(ref);
  });

  it("routes from the main entrance to every destination, with and without stairs", () => {
    const destinations = building.units.filter((u) => DESTINATION_CATEGORIES.has(u.category));
    for (const unit of destinations) {
      for (const stepFree of [false, true]) {
        const route = findRoute(building, graph, from, { type: "unit", unitId: unit.id }, { stepFree });
        expect(route, `${unit.id} stepFree=${stepFree}`).not.toBeNull();
        if (stepFree) expect(route!.stepFree, unit.id).toBe(true);
      }
    }
  });

  it("produces short, well-formed instructions for a multi-level route", () => {
    const route = findRoute(building, graph, from, { type: "unit", unitId: "2.14" }, { stepFree: false })!;
    const steps = condenseSteps(buildSteps(building, route));
    expect(steps[0].type).toBe("depart");
    expect(steps.at(-1)).toMatchObject({ type: "arrive", levelId: "2" });
    expect(steps.filter((s) => s.type === "connector").length).toBeGreaterThan(0);
    expect(steps.length).toBeLessThanOrEqual(12);
  });

  it("keeps the step-free route to the Audmax off the stairs", () => {
    const route = findRoute(building, graph, from, { type: "unit", unitId: "1.32" }, { stepFree: true })!;
    const kinds = route.legs.flatMap((leg) => (leg.type === "connector" ? [leg.kind] : []));
    expect(kinds).not.toContain("stairs");
    expect(kinds).toContain("elevator");
  });
});
