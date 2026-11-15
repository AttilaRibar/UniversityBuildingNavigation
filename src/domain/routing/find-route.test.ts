import { describe, expect, it } from "vitest";
import { demoBuilding, ELEVATOR_ID, ENTRANCE_ID, LEVEL_IDS, STAIRS_ID, WAYPOINT_ID } from "./__fixtures__/demo-building";
import { WALKING_SPEED } from "./costs";
import { findRoute, findRouteToNearest } from "./find-route";
import { buildRouteGraph } from "./graph";
import type { Route, RouteLeg, RoutePoint } from "./types";

const graph = buildRouteGraph(demoBuilding);
const entrance: RoutePoint = { type: "anchor", anchorId: ENTRANCE_ID };
const room = (unitId: string): RoutePoint => ({ type: "unit", unitId });
const route = (from: RoutePoint, to: RoutePoint, stepFree = false) => findRoute(demoBuilding, graph, from, to, { stepFree });

function connectorLegs(r: Route): Extract<RouteLeg, { type: "connector" }>[] {
  return r.legs.filter((leg): leg is Extract<RouteLeg, { type: "connector" }> => leg.type === "connector");
}

describe("findRoute", () => {
  it("finds a same-level route with a simplified walk leg", () => {
    const r = route(entrance, room("u-0-n1"))!;
    expect(r.legs).toEqual([
      {
        type: "walk",
        levelId: LEVEL_IDS[0],
        points: [
          [20, -12],
          [20, 0],
          [9, 0],
          [9, 1.5],
        ],
        length: 24.5,
      },
    ]);
    expect(r.distance).toBeCloseTo(24.5);
    expect(r.duration).toBeCloseTo(24.5 / WALKING_SPEED);
    expect(r.stepFree).toBe(true);
    expect(r.nodeIds[0]).toBe("a:entrance");
    expect(r.nodeIds[r.nodeIds.length - 1]).toBe("o:d-0-n1");
  });

  it("removes collinear points along the corridor", () => {
    const r = route(entrance, room("u-0-e1"))!;
    expect(r.legs[0].type === "walk" && r.legs[0].points).toEqual([
      [20, -12],
      [20, 0],
      [30, 0],
      [40, 10],
      [40, 14],
      [41.5, 14],
    ]);
  });

  it("takes the shortcut with steps by default and avoids it when step-free", () => {
    const normal = route(room("u-0-s2"), room("u-0-e1"))!;
    const stepFree = route(room("u-0-s2"), room("u-0-e1"), true)!;
    expect(normal.stepFree).toBe(false);
    expect(stepFree.stepFree).toBe(true);
    expect(stepFree.distance).toBeGreaterThan(normal.distance);
  });

  it("prefers the stairs for one floor", () => {
    const r = route(room("u-0-e1"), room("u-1-e1"))!;
    expect(r.legs.map((leg) => leg.type)).toEqual(["walk", "connector", "walk"]);
    expect(connectorLegs(r)[0]).toMatchObject({ kind: "stairs", connectorId: STAIRS_ID, fromLevelId: "lvl-0", toLevelId: "lvl-1" });
    expect(r.stepFree).toBe(false);
  });

  it("merges a two-floor stair climb into one connector leg", () => {
    const r = route(room("u-0-e1"), room("u-2-e1"))!;
    expect(connectorLegs(r)).toEqual([
      {
        type: "connector",
        connectorId: STAIRS_ID,
        kind: "stairs",
        fromLevelId: "lvl-0",
        toLevelId: "lvl-2",
        from: [36, -4],
        to: [36, -4],
      },
    ]);
    expect(r.nodeIds).toContain("c:stairs:lvl-1");
  });

  it("uses the elevator for a step-free route, as one leg across two floors", () => {
    const r = route(room("u-0-e1"), room("u-2-e1"), true)!;
    expect(r.stepFree).toBe(true);
    expect(connectorLegs(r)).toEqual([
      expect.objectContaining({ kind: "elevator", connectorId: ELEVATOR_ID, fromLevelId: "lvl-0", toLevelId: "lvl-2" }),
    ]);
    const walked = r.legs.reduce((sum, leg) => sum + (leg.type === "walk" ? leg.length : 0), 0);
    expect(r.distance).toBeCloseTo(walked);
    expect(r.duration).toBeCloseTo(walked / WALKING_SPEED + 35 + 2 * 6);
  });

  it("routes to an anchor on another level", () => {
    const r = route(entrance, { type: "anchor", anchorId: WAYPOINT_ID })!;
    const last = r.legs[r.legs.length - 1];
    expect(last.type === "walk" && last.points[last.points.length - 1]).toEqual([40, 20]);
  });

  it("returns null when the destination cannot be reached", () => {
    const noElevator = { ...demoBuilding, connectors: demoBuilding.connectors.filter((c) => c.id !== ELEVATOR_ID) };
    const g = buildRouteGraph(noElevator);
    expect(findRoute(noElevator, g, entrance, room("u-1-n1"), { stepFree: true })).toBeNull();
    expect(findRoute(noElevator, g, entrance, room("u-1-n1"), { stepFree: false })).not.toBeNull();
    expect(route(entrance, room("u-0-elevator"))).toBeNull();
  });

  it("returns an empty route when origin equals destination", () => {
    expect(route(room("u-1-n1"), room("u-1-n1"))).toEqual({
      origin: room("u-1-n1"),
      destination: room("u-1-n1"),
      nodeIds: [],
      legs: [],
      distance: 0,
      duration: 0,
      stepFree: true,
    });
  });

  it("is deterministic", () => {
    expect(route(entrance, room("u-2-w1"))).toEqual(route(entrance, room("u-2-w1")));
  });
});

describe("findRouteToNearest", () => {
  const restrooms = ["u-0-e2", "u-1-s1", "u-2-n1"];

  it("reaches the cheapest of several units and reports it as the destination", () => {
    expect(findRouteToNearest(demoBuilding, graph, entrance, restrooms, { stepFree: false })?.destination).toEqual(room("u-0-e2"));
    expect(findRouteToNearest(demoBuilding, graph, room("u-2-e1"), restrooms, { stepFree: false })?.destination).toEqual(
      room("u-2-n1"),
    );
  });

  it("returns null when none of the units can be reached", () => {
    expect(findRouteToNearest(demoBuilding, graph, entrance, ["u-0-stairs", "missing"], { stepFree: false })).toBeNull();
  });
});
