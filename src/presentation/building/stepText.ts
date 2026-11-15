import type { IndoorBuilding, LocalizedText, Unit } from "@/domain/indoor/model";
import { levelById } from "@/domain/indoor/model";
import type { Vec2 } from "@/domain/geometry/vec2";
import type { RoutePoint, RouteStep } from "@/domain/routing";
import type { BuildingMessages } from "@/presentation/i18n/messages/building";

export type StepIcon =
  | "straight"
  | "left"
  | "right"
  | "slight_left"
  | "slight_right"
  | "u_turn"
  | "stairs_up"
  | "stairs_down"
  | "elevator_up"
  | "elevator_down"
  | "enter"
  | "arrive";

/**
 * Walking up to the building from the street. Not part of the indoor route: the
 * screen adds it in front of the route when it starts at an entrance, and shows
 * it on the street map instead of the 3D model.
 */
export interface ApproachStep {
  type: "approach";
  anchorId: string;
  levelId: string;
  position: Vec2;
}

/** One step as the screen shows it: the indoor route steps, optionally after an approach. */
export type NavStep = RouteStep | ApproachStep;

/** What one instruction card shows. */
export interface StepCard {
  icon: StepIcon;
  title: string;
  subtitle: string | null;
}

export interface StepTextContext {
  building: IndoorBuilding;
  messages: BuildingMessages;
  text: (value: LocalizedText) => string;
  origin: RoutePoint;
  destination: RoutePoint;
}

/** Walking distances are rounded: nobody counts single metres in a corridor. */
export function formatDistance(metres: number, m: BuildingMessages): string {
  if (metres < 10) return m.units.metres(Math.max(1, Math.round(metres)));
  return m.units.about(m.units.metres(Math.round(metres / 5) * 5));
}

export function formatDuration(seconds: number, m: BuildingMessages): string {
  return seconds < 50 ? m.units.underMinute : m.units.about(m.units.minutes(Math.max(1, Math.round(seconds / 60))));
}

/** Short display name of a room: its number if it has one, otherwise its name. */
export function unitTitle(unit: Unit, ctx: Pick<StepTextContext, "messages" | "text">): string {
  return unit.ref ?? (unit.name ? ctx.text(unit.name) : ctx.messages.category[unit.category]);
}

export function pointName(point: RoutePoint, ctx: StepTextContext): string {
  if (point.type === "anchor") {
    const anchor = ctx.building.anchors.find((a) => a.id === point.anchorId);
    return anchor ? ctx.text(anchor.name) : "";
  }
  const unit = ctx.building.units.find((u) => u.id === point.unitId);
  return unit ? unitTitle(unit, ctx) : "";
}

const TURN_ICON = {
  slight_left: "slight_left",
  left: "left",
  sharp_left: "left",
  slight_right: "slight_right",
  right: "right",
  sharp_right: "right",
  u_turn: "u_turn",
} as const;

/** Turns a structured route step into the words and icon of its card. */
export function describeStep(steps: readonly NavStep[], index: number, ctx: StepTextContext): StepCard {
  const m = ctx.messages;
  const step = steps[index];
  const next = steps[index + 1];

  if (step.type === "approach") {
    const anchor = ctx.building.anchors.find((a) => a.id === step.anchorId);
    return { icon: "enter", title: m.step.enter, subtitle: anchor ? m.step.enterAt(ctx.text(anchor.name)) : null };
  }

  if (step.type === "connector") {
    const way = step.direction > 0 ? "up" : "down";
    const level = ctx.text(levelById(ctx.building, step.toLevelId).name);
    const icon: StepIcon = step.kind === "elevator" ? `elevator_${way}` : `stairs_${way}`;
    return { icon, title: m.step.connector[step.kind][way], subtitle: m.step.toLevel(level) };
  }

  if (step.type === "arrive") {
    return { icon: "arrive", title: m.step.arrive(pointName(ctx.destination, ctx)), subtitle: ctx.destination.type === "unit" ? m.step.arriveSide[step.side] : null };
  }

  const distance = formatDistance(step.distance, m);
  const parts = [next?.type === "connector" ? m.step.walkTo[next.kind](distance) : m.step.walk(distance)];
  if (step.landmark) {
    const unit = ctx.building.units.find((u) => u.id === step.landmark?.unitId);
    if (unit) parts.push(m.step.landmark[step.landmark.side](unitTitle(unit, ctx)));
  }
  const subtitle = parts.join(". ").replace(/\.\./g, ".");

  if (step.type === "turn") return { icon: TURN_ICON[step.direction], title: m.step.turn[step.direction], subtitle };
  if (step.exitTurn) return { icon: step.exitTurn, title: m.step.exit[step.exitTurn], subtitle };
  if (index === 0 || steps[index - 1].type === "approach") return { icon: "straight", title: m.step.departFrom(pointName(ctx.origin, ctx)), subtitle };
  return { icon: "straight", title: m.step.continueStraight, subtitle };
}
