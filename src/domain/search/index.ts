import { DESTINATION_CATEGORIES } from "../indoor/model";
import type {
  IndoorBuilding,
  LocalizedText,
  Unit,
  UnitCategory,
} from "../indoor/model";
import { canonicalRef, foldText } from "./normalize";

export interface SearchEntry {
  unitId: string;
  buildingId: string;
  levelId: string;
  ref: string | null;
  name: LocalizedText | null;
  category: UnitCategory;
  occupant: string | null;
  capacity: number | null;
  /** canonicalRef of `ref`, if any */
  refKey: string | null;
  /**
   * Folded, de-duplicated search terms: names (hu, en) first, then aliases,
   * then the occupant.
   */
  terms: readonly string[];
  /** How many leading `terms` are names; the rest are aliases or the occupant. */
  nameTermCount: number;
}

export interface SearchIndex {
  entries: readonly SearchEntry[];
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter((v) => v !== ""))];
}

function toEntry(buildingId: string, unit: Unit): SearchEntry {
  const names = unique(
    unit.name ? [foldText(unit.name.hu), foldText(unit.name.en)] : [],
  );
  const others = unique(
    [...unit.aliases, ...(unit.occupant ? [unit.occupant] : [])].map(foldText),
  );
  return {
    unitId: unit.id,
    buildingId,
    levelId: unit.levelId,
    ref: unit.ref,
    name: unit.name,
    category: unit.category,
    occupant: unit.occupant,
    capacity: unit.capacity,
    refKey: unit.ref === null ? null : canonicalRef(unit.ref),
    terms: unique([...names, ...others]),
    nameTermCount: names.length,
  };
}

/** One entry per navigable destination that has a room number or a name. */
export function buildSearchIndex(
  buildings: readonly IndoorBuilding[],
): SearchIndex {
  const entries = buildings.flatMap((b) =>
    b.units
      .filter(
        (u) =>
          DESTINATION_CATEGORIES.has(u.category) &&
          (u.ref !== null || u.name !== null),
      )
      .map((u) => toEntry(b.id, u)),
  );
  return { entries };
}

export { canonicalRef, foldText, refPrefixKey } from "./normalize";
export type { RefPrefix } from "./normalize";
export { search } from "./search";
export type { MatchKind, SearchHit, SearchOptions } from "./search";
