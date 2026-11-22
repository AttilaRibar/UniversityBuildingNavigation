"use client";

import Link from "next/link";
import { buildingHref } from "@/application/links";
import { useTrackedSearch } from "@/presentation/analytics/useTrackedSearch";
import { campusBuildingById } from "@/data/campus";
import type { SearchHit } from "@/domain/search";
import { useI18n, useMessages } from "@/presentation/i18n/I18nProvider";
import { cityEn, cityHu } from "@/presentation/i18n/messages/city";
import { commonEn, commonHu } from "@/presentation/i18n/messages/common";
import { ChevronRight, Info } from "@/presentation/ui/icons";
import { BuildingRow } from "./BuildingRow";
import { searchBuildings } from "./buildingSearch";
import { useRoomSearch } from "./useRoomSearch";

function RoomRow({ hit, levelName }: { hit: SearchHit; levelName: string | undefined }) {
  const { text } = useI18n();
  const m = useMessages(cityHu, cityEn);
  const c = useMessages(commonHu, commonEn);
  const { entry } = hit;
  const building = campusBuildingById(entry.buildingId);
  const title = entry.ref ?? (entry.name ? text(entry.name) : entry.unitId);
  const subtitle = entry.ref && entry.name ? text(entry.name) : entry.occupant;
  const place = [building?.code ?? (building ? text(building.name) : null), levelName ?? `${c.level} ${entry.levelId}`]
    .filter(Boolean)
    .join(" • ");
  return (
    <Link
      href={buildingHref(entry.buildingId, { to: entry.unitId, source: "search" })}
      className="group flex items-center gap-3 rounded-card px-2 py-3 transition-colors duration-150 hover:bg-surface-2 active:bg-surface-2"
    >
      <span className="grid min-h-11 min-w-16 shrink-0 place-items-center rounded-xl bg-ink px-2 pt-1 text-lg leading-none font-extrabold text-white">
        {title}
      </span>
      <span className="min-w-0 flex-1">
        {subtitle ? <span className="block truncate text-[16px] leading-tight font-bold text-ink">{subtitle}</span> : null}
        <span className="mt-0.5 block truncate text-sm text-muted">
          {place}
          {entry.capacity ? ` • ${m.capacity(entry.capacity)}` : ""}
        </span>
      </span>
      <ChevronRight size={20} className="shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-0.5" />
    </Link>
  );
}

function Heading({ children }: { children: string }) {
  return <h2 className="px-2 pt-3 pb-1 text-xs font-extrabold tracking-[0.08em] text-muted uppercase">{children}</h2>;
}

/** Rooms (from the indoor data) and buildings matching the query. */
export function SearchResults({ query, onSelectBuilding }: { query: string; onSelectBuilding: (id: string) => void }) {
  const { text } = useI18n();
  const m = useMessages(cityHu, cityEn);
  const c = useMessages(commonHu, commonEn);
  const rooms = useRoomSearch(query);
  const buildings = searchBuildings(query);
  const empty = !rooms.loading && rooms.hits.length === 0 && buildings.length === 0;
  useTrackedSearch("city", query, rooms.loading ? null : { rooms: rooms.hits.length, buildings: buildings.length });

  return (
    <div aria-live="polite">
      {rooms.hits.length > 0 ? (
        <section>
          <Heading>{m.roomsHeading}</Heading>
          <ul>
            {rooms.hits.map((hit) => {
              const level = rooms.levelName(hit.entry.buildingId, hit.entry.levelId);
              return (
                <li key={`${hit.entry.buildingId}/${hit.entry.unitId}`} className="animate-fade">
                  <RoomRow hit={hit} levelName={level ? text(level) : undefined} />
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
      {rooms.loading ? <p className="px-2 py-3 text-sm text-muted">{m.searchLoading}</p> : null}
      {buildings.length > 0 ? (
        <section>
          <Heading>{m.buildingsHeading}</Heading>
          <ul>
            {buildings.map((b) => (
              <li key={b.id} className="animate-fade">
                <BuildingRow building={b} onSelect={onSelectBuilding} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {empty ? (
        <div className="mt-4 flex gap-3 rounded-card bg-surface-2 p-4 text-ink-soft animate-rise">
          <Info size={22} className="shrink-0 text-muted" />
          <div>
            <p className="font-bold break-words text-ink">{c.noResults(query.trim())}</p>
            <p className="mt-1 text-sm">{c.noResultsHint}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
