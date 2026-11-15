"use client";

import { useMemo, useState } from "react";
import type { IndoorBuilding } from "@/domain/indoor/model";
import type { RoutePoint } from "@/domain/routing";
import { buildSearchIndex, search } from "@/domain/search";
import { ArrowLeft, Pin } from "@/presentation/ui/icons";
import { SearchField } from "@/presentation/ui/SearchField";
import { RoomRow } from "./RoomRow";
import { useUnitText } from "./useUnitText";

/** Lets the student say where they are: an entrance, or any room they are standing next to. */
export function OriginPicker({ building, onPick, onCancel, backLabel }: { building: IndoorBuilding; onPick: (point: RoutePoint) => void; onCancel: () => void; backLabel: string }) {
  const { title, subtitle, m, text } = useUnitText(building);
  const [query, setQuery] = useState("");
  const index = useMemo(() => buildSearchIndex([building]), [building]);
  const hits = useMemo(() => search(index, query, { limit: 12 }), [index, query]);
  const unitsById = useMemo(() => new Map(building.units.map((u) => [u.id, u])), [building]);

  return (
    <div className="animate-fade px-4 pb-8">
      <div className="mb-3 flex items-center gap-2">
        <button type="button" onClick={onCancel} aria-label={backLabel} className="-ml-2 flex size-11 items-center justify-center rounded-full hover:bg-surface-2">
          <ArrowLeft />
        </button>
        <h2 className="text-xl font-extrabold">{m.origin.title}</h2>
      </div>
      <h3 className="mb-1 text-xs font-bold tracking-wide text-muted uppercase">{m.origin.entrances}</h3>
      <ul className="-mx-2">
        {building.anchors.map((anchor) => (
          <li key={anchor.id}>
            <RoomRow
              leading={<span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-white"><Pin size={20} /></span>}
              title={text(anchor.name)}
              subtitle={building.levels.find((l) => l.id === anchor.levelId)?.name ? text(building.levels.find((l) => l.id === anchor.levelId)!.name) : ""}
              onSelect={() => onPick({ type: "anchor", anchorId: anchor.id })}
            />
          </li>
        ))}
      </ul>
      <h3 className="mt-4 mb-2 text-xs font-bold tracking-wide text-muted uppercase">{m.origin.orRoom}</h3>
      <SearchField value={query} onChange={setQuery} placeholder={m.origin.searchPlaceholder} ariaLabel={m.origin.orRoom} />
      <ul className="-mx-2 mt-1">
        {hits.map((hit) => {
          const unit = unitsById.get(hit.entry.unitId);
          return unit ? (
            <li key={unit.id}>
              <RoomRow title={title(unit)} subtitle={subtitle(unit)} onSelect={() => onPick({ type: "unit", unitId: unit.id })} />
            </li>
          ) : null;
        })}
      </ul>
    </div>
  );
}
