"use client";

import { campusBuildings } from "@/data/campus";
import { useI18n, useMessages } from "@/presentation/i18n/I18nProvider";
import { InstallBanner } from "@/presentation/pwa";
import { cityEn, cityHu } from "@/presentation/i18n/messages/city";
import { BuildingRow } from "./BuildingRow";
import { campusGroups } from "./campuses";

/** Every building grouped by campus: the text alternative of the map. */
export function BuildingList({ onSelect }: { onSelect: (id: string) => void }) {
  const { text } = useI18n();
  const m = useMessages(cityHu, cityEn);
  return (
    <div className="animate-fade">
      <p className="px-2 pb-2 text-[15px] leading-snug text-ink-soft">{m.intro(campusBuildings.length, campusGroups.length)}</p>
      <InstallBanner className="mt-2" />
      {campusGroups.map((campus) => (
        <section key={campus.id} aria-labelledby={`campus-${campus.id}`} className="mt-3">
          <h2
            id={`campus-${campus.id}`}
            className="flex items-baseline justify-between px-2 pt-2 pb-1 text-xs font-extrabold tracking-[0.08em] text-muted uppercase"
          >
            <span>{text(campus.name)}</span>
            <span className="font-bold tracking-normal normal-case">{m.buildingCount(campus.buildings.length)}</span>
          </h2>
          <ul>
            {campus.buildings.map((b) => (
              <li key={b.id}>
                <BuildingRow building={b} onSelect={onSelect} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
