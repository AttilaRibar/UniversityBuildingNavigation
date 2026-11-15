import type { Vec2 } from "../../geometry/vec2";
import type { Connector, IndoorBuilding, Opening, Unit, UnitCategory, Walkway } from "../../indoor/model";
import { anchor, level, makeBuilding, opening, rect, unit, walkway } from "./builders";

/**
 * Demo building used by the routing tests (metres, y up).
 *
 * Every level has the same L-shaped corridor (0,0) → (40,0) → (40,30) with
 * rooms on both sides: n1, n2 and the elevator shaft north of the horizontal
 * arm; s1, s2 and the staircase south of it; e1, e2 east and w1 west of the
 * vertical arm. Doors sit on the room walls 1.5 m from the centre line.
 *
 * - Level 0 has the default entrance anchor at (20,-12) on a walkway that
 *   meets the corridor in a T-junction at (20,0), and a diagonal shortcut
 *   (30,0) → (40,10) with a few steps (`stepFree: false`).
 * - The elevator (stops at (27,3)) serves all levels; the staircase (stops at
 *   (36,-4)) too.
 * - Landmarks: the café L0 n2 and the reception L1 w1.
 */

export const LEVEL_IDS = ["lvl-0", "lvl-1", "lvl-2"] as const;

export const ELEVATOR_ID = "elevator";
export const STAIRS_ID = "stairs";
export const ENTRANCE_ID = "entrance";
export const WAYPOINT_ID = "qr-1";

interface RoomSpec {
  key: string;
  polygon: readonly Vec2[];
  door: Vec2;
}

const ROOMS: readonly RoomSpec[] = [
  { key: "n1", polygon: rect(5, 1.5, 13, 9.5), door: [9, 1.5] },
  { key: "n2", polygon: rect(15, 1.5, 23, 9.5), door: [19, 1.5] },
  { key: "s1", polygon: rect(5, -9.5, 13, -1.5), door: [9, -1.5] },
  { key: "s2", polygon: rect(24, -9.5, 32, -1.5), door: [28, -1.5] },
  { key: "e1", polygon: rect(41.5, 10, 49.5, 18), door: [41.5, 14] },
  { key: "e2", polygon: rect(41.5, 20, 49.5, 28), door: [41.5, 24] },
  { key: "w1", polygon: rect(30.5, 18, 38.5, 26), door: [38.5, 22] },
];

/** Category overrides per "<ordinal>-<room key>"; everything else is an office. */
const CATEGORIES: Readonly<Record<string, UnitCategory>> = {
  "0-n2": "cafe",
  "0-e2": "restroom",
  "1-s1": "restroom",
  "1-w1": "reception",
  "2-n1": "restroom",
  "2-e1": "lecture_hall",
};

const LANDMARKS = new Set(["0-n2", "1-w1"]);

export const unitId = (ordinal: number, key: string): string => `u-${ordinal}-${key}`;
export const openingId = (ordinal: number, key: string): string => `d-${ordinal}-${key}`;

function roomsOfLevel(ordinal: number): { units: Unit[]; openings: Opening[] } {
  const levelId = LEVEL_IDS[ordinal];
  const units = ROOMS.map((room) => {
    const key = `${ordinal}-${room.key}`;
    return unit(unitId(ordinal, room.key), levelId, room.polygon, {
      category: CATEGORIES[key] ?? "office",
      landmark: LANDMARKS.has(key),
    });
  });
  const openings = ROOMS.map((room) => opening(openingId(ordinal, room.key), levelId, unitId(ordinal, room.key), room.door));
  const shafts = [
    unit(`u-${ordinal}-elevator`, levelId, rect(25, 1.5, 29, 5.5), { category: "elevator" }),
    unit(`u-${ordinal}-stairs`, levelId, rect(34, -6.5, 38, -1.5), { category: "stairs" }),
  ];
  return { units: [...units, ...shafts], openings };
}

function walkwaysOfLevel(ordinal: number): Walkway[] {
  const levelId = LEVEL_IDS[ordinal];
  const corridor = walkway(`corridor-${ordinal}`, levelId, [
    [0, 0],
    [40, 0],
    [40, 30],
  ]);
  if (ordinal !== 0) return [corridor];
  return [
    corridor,
    walkway("entrance-hall", levelId, [
      [20, -12],
      [20, 0],
    ]),
    walkway(
      "shortcut",
      levelId,
      [
        [30, 0],
        [40, 10],
      ],
      false,
    ),
  ];
}

function connector(id: string, kind: Connector["kind"], position: Vec2): Connector {
  return { id, kind, name: { hu: id, en: id }, stops: LEVEL_IDS.map((levelId) => ({ levelId, position })) };
}

const perLevel = [0, 1, 2].map((ordinal) => ({ ...roomsOfLevel(ordinal), walkways: walkwaysOfLevel(ordinal) }));

export const demoBuilding: IndoorBuilding = makeBuilding({
  id: "demo",
  name: { hu: "Demó épület", en: "Demo building" },
  levels: [level(LEVEL_IDS[0], 0, "F"), level(LEVEL_IDS[1], 1, "1"), level(LEVEL_IDS[2], 2, "2")],
  units: perLevel.flatMap((l) => l.units),
  openings: perLevel.flatMap((l) => l.openings),
  walkways: perLevel.flatMap((l) => l.walkways),
  connectors: [connector(ELEVATOR_ID, "elevator", [27, 3]), connector(STAIRS_ID, "stairs", [36, -4])],
  anchors: [anchor(ENTRANCE_ID, LEVEL_IDS[0], [20, -12], true), anchor(WAYPOINT_ID, LEVEL_IDS[1], [40, 20])],
});
