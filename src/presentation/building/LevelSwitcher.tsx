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
}

/** Vertical floor picker, top floor first, like the buttons in a lift. */
export function LevelSwitcher({ levels, activeLevelId, routeLevelIds, onSelect, labels, disabled }: LevelSwitcherProps) {
  const ordered = [...levels].sort((a, b) => b.ordinal - a.ordinal);
  const item = (active: boolean) =>
    `relative flex size-11 items-center justify-center text-base font-extrabold transition-colors duration-150 ${
      active ? "bg-accent text-ink" : "text-white hover:bg-white/15"
    } disabled:opacity-100`;
  return (
    <div role="group" aria-label={labels.group} className="pointer-events-auto flex flex-col overflow-hidden rounded-2xl bg-ink shadow-float">
      <button type="button" className={item(activeLevelId === null)} aria-pressed={activeLevelId === null} aria-label={labels.allLevels} disabled={disabled} onClick={() => onSelect(null)}>
        <Layers size={20} />
      </button>
      {ordered.map((level) => (
        <button
          key={level.id}
          type="button"
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
