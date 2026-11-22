"use client";

import { useCallback } from "react";
import { levelById, type IndoorBuilding, type Unit } from "@/domain/indoor/model";
import { useI18n, useMessages } from "@/presentation/i18n/I18nProvider";
import { buildingEn, buildingHu } from "@/presentation/i18n/messages/building";
import { unitTitle } from "../stepText";

/** Display strings for a room, shared by every list and card of the indoor screen. */
export function useUnitText(building: IndoorBuilding) {
  const { text } = useI18n();
  const m = useMessages(buildingHu, buildingEn);
  const title = useCallback((unit: Unit) => unitTitle(unit, { messages: m, text }), [m, text]);
  /** "Lecture room • Ground floor" or, for a numbered room with a name, the name first. */
  const subtitle = useCallback(
    (unit: Unit) => {
      const what = unit.ref && unit.name ? text(unit.name) : m.category[unit.category];
      // "1. emelet" must not break after the number.
      return `${what} • ${text(levelById(building, unit.levelId).name).replace(/ /g, "\u00a0")}`;
    },
    [building, m, text],
  );
  return { title, subtitle, m, text };
}
