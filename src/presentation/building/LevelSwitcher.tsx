import type { Level } from "@/domain/indoor/model";
import { Layers } from "@/presentation/ui/icons";

export interface LevelSwitcherProps {
  levels: readonly Level[];
  /** Highlighted level; null = the all-levels overview. */
  activeLevelId: string | null;
  /** Levels the current route passes through get a marker. */
  routeLevelIds: readonly string[];
  onSelect: (levelId: string | null) => void;
  labels: { group: string; allLevels: string; level: (level: Level) => string };
  disabled?: boolean;
  /**
   * Height the switcher may use, in px. On short phones the bottom sheet would hide the
   * lower floors, so the buttons shrink (down to 32 px) and, as a last resort, the list scrolls.
   */
  maxHeight?: number;
}

const FULL = 44;
const MIN = 32;

/** Vertical floor picker, top floor first, like the buttons in a lift. */
export function LevelSwitcher({ levels, activeLevelId, routeLevelIds, onSelect, labels, disabled, maxHeight }: LevelSwitcherProps) {
  const ordered = [...levels].sort((a, b) => b.ordinal - a.ordinal);
  const count = ordered.length + 1;
  const size = maxHeight && maxHeight > 0 ? Math.max(MIN, Math.min(FULL, Math.floor(maxHeight / count))) : FULL;
  const item = (active: boolean) =>
    `relative flex w-11 shrink-0 items-center justify-center text-base font-extrabold transition-[height,background-color,color] duration-200 ${
      active ? "bg-accent text-ink" : "text-white hover:bg-white/15"
    } disabled:opacity-100`;
  return (
    <div
      role="group"
      aria-label={labels.group}
      className="pointer-events-auto flex flex-col overflow-x-hidden overflow-y-auto overscroll-contain rounded-2xl bg-ink shadow-float [scrollbar-width:none]"
      style={maxHeight && maxHeight > 0 && size * count > maxHeight ? { maxHeight: Math.max(maxHeight, MIN * 2) } : undefined}
    >
      <button type="button" style={{ height: size }} className={item(activeLevelId === null)} aria-pressed={activeLevelId === null} aria-label={labels.allLevels} disabled={disabled} onClick={() => onSelect(null)}>
        <Layers size={20} />
      </button>
      {ordered.map((level) => (
        <button
          key={level.id}
          type="button"
          style={{ height: size }}
          className={item(activeLevelId === level.id)}
          aria-pressed={activeLevelId === level.id}
          aria-label={labels.level(level)}
          disabled={disabled}
          onClick={() => onSelect(level.id)}
        >
          {level.shortName}
          {routeLevelIds.includes(level.id) && activeLevelId !== level.id ? (
            <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-accent" aria-hidden="true" />
          ) : null}
        </button>
      ))}
    </div>
  );
}
