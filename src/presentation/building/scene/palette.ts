import type { UnitCategory } from "@/domain/indoor/model";

/** Scene colours. Yellow is reserved for the route and the destination. */
export const COLORS = {
  background: "#c9d4e2",
  slab: "#dce4ef",
  slabSide: "#a9b9cf",
  slabEdge: "#4f6283",
  shadow: "#aebccf",
  edge: "#14213d",
  accent: "#ffd21f",
  accentDeep: "#f2b600",
  ink: "#14213d",
  origin: "#2f6bff",
} as const;

export interface UnitStyle {
  color: string;
  /** Block height in metres; 0 = drawn flat on the floor. */
  height: number;
}

const ROOM = "#ffffff";

const STYLES: Record<UnitCategory, UnitStyle> = {
  lecture_hall: { color: ROOM, height: 1.5 },
  auditorium: { color: ROOM, height: 2.2 },
  conference: { color: ROOM, height: 1.5 },
  laboratory: { color: ROOM, height: 1.5 },
  office: { color: ROOM, height: 1.3 },
  restroom: { color: "#bfe0f5", height: 1.1 },
  restroom_accessible: { color: "#9fd0ef", height: 1.1 },
  cafe: { color: "#ffe9bf", height: 1.3 },
  reception: { color: "#dbe6f6", height: 1.1 },
  service: { color: "#cdd6e3", height: 0.5 },
  stairs: { color: "#9fb0c8", height: 0.6 },
  elevator: { color: "#14213d", height: 2.6 },
  lobby: { color: "#f6f8fc", height: 0 },
  walkway: { color: "#f6f8fc", height: 0 },
  parking: { color: "#d7dfea", height: 0 },
  outdoor: { color: "#c4dbc9", height: 0 },
};

/** Faint tint by occupant, echoing the colour coding of the building's own signs. */
const OCCUPANT_TINT: Record<string, string> = {
  EKIK: "#e2f1f0",
  "Rektori Hivatal": "#fbf2d5",
};

export function unitStyle(category: UnitCategory, occupant: string | null): UnitStyle {
  const base = STYLES[category];
  const tint = occupant && base.color === ROOM ? OCCUPANT_TINT[occupant] : undefined;
  return tint ? { ...base, color: tint } : base;
}
