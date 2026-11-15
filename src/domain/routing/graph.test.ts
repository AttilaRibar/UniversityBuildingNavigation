import { describe, expect, it } from "vitest";
import { distance } from "../geometry/vec2";
import { anchor, level, makeBuilding, opening, rect, unit, walkway } from "./__fixtures__/builders";
import { demoBuilding, ELEVATOR_ID, ENTRANCE_ID, LEVEL_IDS, openingId, STAIRS_ID } from "./__fixtures__/demo-building";
import { anchorNodeId, buildRouteGraph, connectorNodeId, openingNodeId, walkwayNodeId } from "./graph";
import type { GraphEdge, RouteGraph } from "./types";

function degree(graph: RouteGraph, id: string): number {
  return graph.adjacency.get(id)?.length ?? 0;
}

function edgesBetween(graph: RouteGraph, a: string, b: string): GraphEdge[] {
  return (graph.adjacency.get(a) ?? []).filter((e) => (e.from === a && e.to === b) || (e.from === b && e.to === a));
}

function reachableFrom(graph: RouteGraph, start: string): Set<string> {
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length > 0) {
    const id = queue.shift() as string;
    for (const edge of graph.adjacency.get(id) ?? []) {
      const next = edge.from === id ? edge.to : edge.from;
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}

describe("buildRouteGraph on the demo building", () => {
  const graph = buildRouteGraph(demoBuilding);

  it("creates typed nodes that can be looked up by feature id", () => {
    expect(graph.nodes.get(openingNodeId(openingId(0, "n1")))).toMatchObject({ kind: "opening", unitId: "u-0-n1" });
    expect(graph.nodes.get(connectorNodeId(ELEVATOR_ID, LEVEL_IDS[1]))).toMatchObject({
      kind: "connector",
      connectorId: ELEVATOR_ID,
    });
    expect(graph.nodes.get(anchorNodeId(ENTRANCE_ID))).toMatchObject({ kind: "anchor", anchorId: ENTRANCE_ID });
  });

  it("connects every node into one component", () => {
    expect(reachableFrom(graph, anchorNodeId(ENTRANCE_ID)).size).toBe(graph.nodes.size);
  });

  it("merges the T-junction of the entrance hall with the corridor into one node", () => {
    const junction = walkwayNodeId(LEVEL_IDS[0], [20, 0]);
    expect(degree(graph, junction)).toBe(3);
    expect(degree(graph, walkwayNodeId(LEVEL_IDS[1], [20, 0]))).toBe(0);
  });

  it("joins a door to its projection on the corridor with a spur", () => {
    const door = openingNodeId(openingId(0, "n1"));
    const [spur] = edgesBetween(graph, door, walkwayNodeId(LEVEL_IDS[0], [9, 0]));
    expect(spur).toMatchObject({ kind: "walk", length: 1.5, cost: 1.5, stepFree: true });
  });

  it("splits walk edges at projections, keeps stepFree from the walkway", () => {
    const shortcut = edgesBetween(graph, walkwayNodeId(LEVEL_IDS[0], [30, 0]), walkwayNodeId(LEVEL_IDS[0], [40, 10]));
    expect(shortcut).toHaveLength(1);
    expect(shortcut[0].stepFree).toBe(false);
    expect(edgesBetween(graph, walkwayNodeId(LEVEL_IDS[0], [27, 0]), walkwayNodeId(LEVEL_IDS[0], [28, 0]))).toHaveLength(1);
  });

  it("links stairs between consecutive stops and the elevator between every pair", () => {
    const stairs = (l: number) => connectorNodeId(STAIRS_ID, LEVEL_IDS[l]);
    const lift = (l: number) => connectorNodeId(ELEVATOR_ID, LEVEL_IDS[l]);
    expect(edgesBetween(graph, stairs(0), stairs(1))[0]).toMatchObject({ kind: "stairs", stepFree: false, cost: 18, length: 0 });
    expect(edgesBetween(graph, stairs(0), stairs(2))).toHaveLength(0);
    expect(edgesBetween(graph, lift(0), lift(1))[0]).toMatchObject({ kind: "elevator", stepFree: true, cost: 35, length: 0 });
    expect(edgesBetween(graph, lift(0), lift(2))[0]).toMatchObject({ cost: 40, connectorId: ELEVATOR_ID });
  });

  it("keeps every edge cost at least the planar distance between its nodes", () => {
    for (const edges of graph.adjacency.values()) {
      for (const edge of edges) {
        const planar = distance(graph.nodes.get(edge.from)!.position, graph.nodes.get(edge.to)!.position);
        expect(edge.cost).toBeGreaterThanOrEqual(planar - 1e-9);
      }
    }
  });

  it("is deterministic", () => {
    const again = buildRouteGraph(demoBuilding);
    expect([...again.nodes.keys()]).toEqual([...graph.nodes.keys()]);
    expect([...again.adjacency.values()]).toEqual([...graph.adjacency.values()]);
  });
});

describe("buildRouteGraph junctions", () => {
  it("creates a shared node where two walkways cross", () => {
    const graph = buildRouteGraph(
      makeBuilding({
        walkways: [
          walkway("h", "L0", [
            [0, 0],
            [10, 0],
          ]),
          walkway("v", "L0", [
            [5, -5],
            [5, 5],
          ]),
        ],
      }),
    );
    expect(graph.nodes.size).toBe(5);
    expect(degree(graph, walkwayNodeId("L0", [5, 0]))).toBe(4);
  });

  it("merges endpoints that coincide after rounding to 1 cm", () => {
    const graph = buildRouteGraph(
      makeBuilding({
        walkways: [
          walkway("a", "L0", [
            [0, 0],
            [10, 0],
          ]),
          walkway("b", "L0", [
            [10.004, 0.003],
            [10, 10],
          ]),
        ],
      }),
    );
    expect([...graph.nodes.keys()]).toEqual(["w:L0:0.00:0.00", "w:L0:10.00:0.00", "w:L0:10.00:10.00"]);
    expect(degree(graph, "w:L0:10.00:0.00")).toBe(2);
  });

  it("gives a feature lying on the network its own node with a zero-length spur", () => {
    const graph = buildRouteGraph(
      makeBuilding({
        walkways: [
          walkway("a", "L0", [
            [0, 0],
            [10, 0],
          ]),
        ],
        anchors: [anchor("start", "L0", [4, 0], true)],
      }),
    );
    expect(edgesBetween(graph, "a:start", "w:L0:4.00:0.00")[0]).toMatchObject({ length: 0, cost: 0 });
  });

  it("skips levels without walkways and features that cannot be snapped", () => {
    const building = makeBuilding({
      levels: [level("L0", 0, "F"), level("L1", 1, "1")],
      units: [unit("far", "L0", rect(0, 20, 5, 25)), unit("upstairs", "L1", rect(0, 0, 5, 5))],
      walkways: [
        walkway("a", "L0", [
          [0, 0],
          [10, 0],
        ]),
      ],
      openings: [opening("d-far", "L0", "far", [2, 20]), opening("d-up", "L1", "upstairs", [2, 0])],
    });
    const graph = buildRouteGraph(building);
    expect(graph.nodes.has("o:d-far")).toBe(false);
    expect(graph.nodes.has("o:d-up")).toBe(false);
    expect(graph.nodes.size).toBe(2);
  });
});
