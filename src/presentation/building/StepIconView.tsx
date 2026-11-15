import { ArrowUp, ArrowUpLeft, ArrowUpRight, Elevator, Flag, Stairs, TurnLeft, TurnRight, UTurn } from "@/presentation/ui/icons";
import type { StepIcon } from "./stepText";

const ICONS = {
  straight: ArrowUp,
  left: TurnLeft,
  right: TurnRight,
  slight_left: ArrowUpLeft,
  slight_right: ArrowUpRight,
  u_turn: UTurn,
  stairs_up: Stairs,
  stairs_down: Stairs,
  elevator_up: Elevator,
  elevator_down: Elevator,
  arrive: Flag,
} satisfies Record<StepIcon, unknown>;

export function StepIconView({ icon, size = 24 }: { icon: StepIcon; size?: number }) {
  const Icon = ICONS[icon];
  return <Icon size={size} />;
}
