"use client";

import type { CampusBuilding } from "@/domain/campus/model";
import { useI18n, useMessages } from "@/presentation/i18n/I18nProvider";
import { cityEn, cityHu } from "@/presentation/i18n/messages/city";
import { ChevronRight, Layers } from "@/presentation/ui/icons";
import { buildingColors } from "./labelData";

/** Stacked colour dots of a building's faculties. */
export function ColorDots({ colors, size = 12 }: { colors: readonly string[]; size?: number }) {
  return (
    <span className="inline-flex shrink-0" aria-hidden="true">
      {colors.map((color, i) => (
        <span
          key={`${color}-${i}`}
          className="rounded-full ring-2 ring-surface"
          style={{ background: color, width: size, height: size, marginLeft: i === 0 ? 0 : -size / 3 }}
        />
      ))}
    </span>
  );
}

export function CodeBadge({ code, className }: { code: string; className?: string }) {
  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center rounded-md bg-ink px-1.5 pt-0.5 text-[13px] font-extrabold tracking-wide text-white ${className ?? ""}`}
    >
      {code}
    </span>
  );
}

export function IndoorTag() {
  const m = useMessages(cityHu, cityEn);
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-md bg-accent px-1.5 pt-0.5 text-xs font-bold text-ink">
      <Layers size={14} className="-mt-0.5" />
      {m.indoorTag}
    </span>
  );
}

/** A tappable building in the list or the search results. */
export function BuildingRow({ building, onSelect }: { building: CampusBuilding; onSelect: (id: string) => void }) {
  const { text } = useI18n();
  return (
    <button
      type="button"
      onClick={() => onSelect(building.id)}
      className="group flex w-full items-center gap-3 rounded-card px-2 py-3 text-left transition-colors duration-150 hover:bg-surface-2 active:bg-surface-2"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-2 transition-transform duration-200 group-hover:scale-105">
        <ColorDots colors={buildingColors(building)} size={14} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[17px] leading-tight font-bold text-ink">{text(building.name)}</span>
          {building.code ? <CodeBadge code={building.code} /> : null}
        </span>
        <span className="mt-0.5 block truncate text-sm text-muted">{text(building.description)}</span>
        {building.hasIndoorMap ? (
          <span className="mt-1.5 block">
            <IndoorTag />
          </span>
        ) : null}
      </span>
      <ChevronRight size={20} className="shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-0.5" />
    </button>
  );
}
