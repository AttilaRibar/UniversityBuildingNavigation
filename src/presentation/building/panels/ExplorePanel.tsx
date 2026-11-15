"use client";

import { useMemo } from "react";
import type { IndoorBuilding, Unit, UnitCategory } from "@/domain/indoor/model";
import { DESTINATION_CATEGORIES } from "@/domain/indoor/model";
import { buildSearchIndex, search } from "@/domain/search";
import { useMessages } from "@/presentation/i18n/I18nProvider";
import { commonEn, commonHu } from "@/presentation/i18n/messages/common";
import { Chip } from "@/presentation/ui/Chip";
import { Building, Coffee, Info, Restroom } from "@/presentation/ui/icons";
import { RoomRow } from "./RoomRow";
import { useUnitText } from "./useUnitText";

const QUICK: Array<{ key: "restroom" | "cafe" | "reception" | "lobby"; categories: UnitCategory[]; icon: typeof Coffee }> = [
  { key: "restroom", categories: ["restroom", "restroom_accessible"], icon: Restroom },
  { key: "cafe", categories: ["cafe"], icon: Coffee },
  { key: "reception", categories: ["reception"], icon: Info },
  { key: "lobby", categories: ["lobby"], icon: Building },
];

export interface ExplorePanelProps {
  building: IndoorBuilding;
  query: string;
  onSelect: (unitId: string) => void;
  onNearest: (categories: readonly UnitCategory[]) => void;
}

/** Default sheet content: search results while typing, otherwise shortcuts and all rooms by level. */
export function ExplorePanel({ building, query, onSelect, onNearest }: ExplorePanelProps) {
  const common = useMessages(commonHu, commonEn);
  const { title, subtitle, m, text } = useUnitText(building);
  const index = useMemo(() => buildSearchIndex([building]), [building]);
  const unitsById = useMemo(() => new Map(building.units.map((u) => [u.id, u])), [building]);
  const hits = useMemo(() => search(index, query, { limit: 30 }), [index, query]);

  const byLevel = useMemo(() => {
    const destinations = building.units.filter((u) => DESTINATION_CATEGORIES.has(u.category) && (u.ref || u.name));
    return [...building.levels]
      .sort((a, b) => b.ordinal - a.ordinal)
      .map((level) => ({
        level,
        numbered: destinations.filter((u) => u.levelId === level.id && u.ref),
        named: destinations.filter((u) => u.levelId === level.id && !u.ref),
      }));
  }, [building]);

  if (query.trim() !== "") {
    return (
      <section aria-label={m.searchResults} className="px-2 pb-6">
        {hits.length === 0 ? (
          <p className="px-3 py-6 text-center text-muted">{common.noResults}</p>
        ) : (
          <ul>
            {hits.map((hit) => {
              const unit = unitsById.get(hit.entry.unitId) as Unit;
              return (
                <li key={unit.id}>
                  <RoomRow title={title(unit)} subtitle={subtitle(unit)} meta={unit.capacity ? m.place.seats(unit.capacity) : null} onSelect={() => onSelect(unit.id)} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    );
  }

  return (
    <div className="px-4 pb-8">
      <h2 className="mb-2 text-xs font-bold tracking-wide text-muted uppercase">{m.quickFind}</h2>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {QUICK.map(({ key, categories, icon: Icon }) => (
          <Chip key={key} icon={<Icon size={18} />} onClick={() => onNearest(categories)}>
            {m.quick[key]}
          </Chip>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted">{common.searchHint}</p>

      <h2 className="mt-6 mb-1 text-xs font-bold tracking-wide text-muted uppercase">{m.browseByLevel}</h2>
      {byLevel.map(({ level, numbered, named }) => (
        <section key={level.id} className="border-b border-line py-3 last:border-0">
          <h3 className="mb-2 flex items-center gap-2 font-extrabold">
            <span className="flex size-7 items-center justify-center rounded-lg bg-ink text-sm text-white">{level.shortName}</span>
            {text(level.name)}
          </h3>
          <ul className="flex flex-wrap gap-1.5">
            {[...named, ...numbered].map((unit) => (
              <li key={unit.id}>
                <button
                  type="button"
                  onClick={() => onSelect(unit.id)}
                  className="min-h-9 rounded-chip bg-surface-2 px-2.5 text-sm font-bold transition-colors duration-150 hover:bg-line active:bg-accent"
                >
                  {title(unit)}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="mt-4 text-xs text-muted">{m.dataNote}</p>
    </div>
  );
}
