import type {
  IndoorBuilding,
  Level,
  Unit,
  UnitCategory,
} from "../../indoor/model";

const SQUARE = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
] as const;

const level = (id: string, ordinal: number): Level => ({
  id,
  ordinal,
  shortName: id.toUpperCase(),
  name: { hu: id, en: id },
  elevation: ordinal * 4,
  slabs: [],
});

function unit(
  id: string,
  levelId: string,
  category: UnitCategory,
  extra: Partial<Unit> = {},
): Unit {
  return {
    id,
    levelId,
    ref: null,
    name: null,
    category,
    polygon: SQUARE,
    occupant: null,
    aliases: [],
    capacity: null,
    landmark: false,
    accuracy: "surveyed",
    ...extra,
  };
}

const lectureHalls = Array.from({ length: 9 }, (_, i) =>
  unit(`u-f0${i + 1}`, "F", "lecture_hall", {
    ref: `F.0${i + 1}`,
    capacity: 40,
  }),
);

export const FIXTURE_BUILDING: IndoorBuilding = {
  id: "ba",
  name: { hu: "Bécsi úti épület", en: "Bécsi Street Building" },
  georeference: { origin: [19.0, 47.5], xAxisBearing: 0 },
  levels: [level("A", 0), level("F", 1), level("1", 2), level("2", 3)],
  units: [
    unit("u-a01", "A", "office", {
      ref: "A.01",
      name: { hu: "Raktár iroda", en: "Storage office" },
    }),
    ...lectureHalls,
    unit("u-cafe", "F", "cafe", { name: { hu: "Büfé", en: "Café" } }),
    unit("u-wc-f", "F", "restroom", { name: { hu: "Mosdó", en: "Restroom" } }),
    unit("u-wc-1", "1", "restroom_accessible", {
      name: { hu: "Akadálymentes mosdó", en: "Accessible restroom" },
    }),
    unit("u-132", "1", "auditorium", {
      ref: "1.32",
      name: { hu: "Kármán Tódor nagyelőadó", en: "Auditorium Maximum" },
      aliases: ["Audmax", "AudMax"],
      capacity: 300,
    }),
    unit("u-202", "2", "office", {
      ref: "2.02",
      name: { hu: "Dékáni hivatal", en: "Dean's office" },
    }),
    unit("u-210", "2", "laboratory", {
      ref: "2.10",
      occupant: "NIK",
      name: { hu: "Robotika labor", en: "Robotics lab" },
    }),
    unit("u-211", "2", "laboratory", { ref: "2.11", occupant: "NIK" }),
    unit("u-212", "2", "laboratory", { ref: "2.12", occupant: "NIK" }),
    unit("u-walk", "F", "walkway", { name: { hu: "Folyosó", en: "Corridor" } }),
    unit("u-stairs", "F", "stairs", {
      ref: "F.20",
      name: { hu: "Főlépcső", en: "Main stairs" },
    }),
    unit("u-nameless", "2", "service"),
  ],
  openings: [],
  walkways: [],
  connectors: [],
  anchors: [],
  amenities: [],
};

/** A second building, to exercise the `buildingId` filter. */
export const OTHER_BUILDING: IndoorBuilding = {
  ...FIXTURE_BUILDING,
  id: "bb",
  units: [
    unit("u-bb-lab", "F", "laboratory", {
      ref: "F.01",
      name: { hu: "Fizika labor", en: "Physics lab" },
    }),
  ],
};
