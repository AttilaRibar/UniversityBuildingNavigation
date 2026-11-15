"use client";

import { useMemo } from "react";
import type { CampusBuilding } from "@/domain/campus/model";
import { facultyByAbbr } from "@/data/campus";
import { useI18n, useMessages } from "@/presentation/i18n/I18nProvider";
import { cityEn, cityHu } from "@/presentation/i18n/messages/city";
import { buildingShortLabel, campusGroups } from "./campuses";
import type { BuildingLabelData, CampusLabelData } from "./mapLabels";

/** Colours a building stands for: its faculties', or its own map colour when it has none. */
export function buildingColors(building: CampusBuilding): string[] {
  const colors = building.faculties.map((abbr) => facultyByAbbr(abbr)?.color ?? building.color);
  return colors.length > 0 ? colors : [building.color];
}

/** When labels collide, teaching buildings beat dormitories, and buildings with an indoor map beat the rest. */
function labelPriority(b: CampusBuilding): number {
  return (b.kind === "faculty" ? 100 : 0) + (b.hasIndoorMap ? 50 : 0) + b.height;
}

/** Localised texts and positions for the map's label chips. */
export function useLabelData() {
  const { text } = useI18n();
  const m = useMessages(cityHu, cityEn);
  return useMemo(() => {
    const campuses: CampusLabelData[] = campusGroups.map((g) => ({
      id: g.id,
      lngLat: g.center,
      title: text(g.name),
      buildingIds: g.buildings.map((b) => b.id),
      colors: [...new Set(g.buildings.flatMap(buildingColors))],
    }));
    const buildings: BuildingLabelData[] = campusGroups.flatMap((g) =>
      g.buildings.map((b) => ({
        id: b.id,
        lngLat: b.location,
        title: buildingShortLabel(b, text),
        sub: b.faculties.join(" · "),
        colors: buildingColors(b),
        ariaLabel: m.buildingChip(
          text(b.name),
          b.faculties.map((abbr) => facultyByAbbr(abbr)?.name).flatMap((n) => (n ? [text(n)] : [])).join(", "),
        ),
        height: b.height,
        priority: labelPriority(b),
      })),
    );
    const campusAriaLabel = (lead: CampusLabelData, merged: readonly CampusLabelData[]) => {
      const all = [lead, ...merged];
      const count = all.reduce((n, c) => n + c.buildingIds.length, 0);
      return merged.length === 0
        ? m.campusChip(lead.title, count)
        : m.campusClusterChip(all.map((c) => c.title).join(", "), count);
    };
    return { campuses, buildings, campusAriaLabel, mapLabel: m.mapLabel };
  }, [text, m]);
}
