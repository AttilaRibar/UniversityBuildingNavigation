"use client";

import { useEffect, useMemo, useState } from "react";
import { loadSearchIndex } from "@/application/room-search";
import { INDOOR_BUILDING_IDS, loadIndoorBuilding } from "@/data/buildings";
import type { LocalizedText } from "@/domain/indoor/model";
import { search, type SearchHit, type SearchIndex } from "@/domain/search";

interface RoomSearchData {
  index: SearchIndex;
  /** Level names keyed by `buildingId/levelId`, e.g. "ba/F" → Földszint. */
  levelNames: ReadonlyMap<string, LocalizedText>;
}

export interface RoomSearchResult {
  /** True until the index has been downloaded (only after the first real query). */
  loading: boolean;
  hits: readonly SearchHit[];
  levelName: (buildingId: string, levelId: string) => LocalizedText | undefined;
}

const RESULT_LIMIT = 12;

let dataPromise: Promise<RoomSearchData> | null = null;

function loadRoomSearchData(): Promise<RoomSearchData> {
  dataPromise ??= Promise.all([loadSearchIndex(), Promise.all(INDOOR_BUILDING_IDS.map(loadIndoorBuilding))]).then(
    ([index, bundles]) => ({
      index,
      levelNames: new Map(bundles.flatMap(({ building }) => building.levels.map((l) => [`${building.id}/${l.id}`, l.name] as const))),
    }),
  );
  return dataPromise;
}

/** Room search that downloads the indoor data only once the user starts typing. */
export function useRoomSearch(query: string): RoomSearchResult {
  const [data, setData] = useState<RoomSearchData | null>(null);
  const wanted = query.trim() !== "";

  useEffect(() => {
    if (!wanted || data) return;
    let alive = true;
    loadRoomSearchData().then(
      (loaded) => alive && setData(loaded),
      () => alive && setData({ index: { entries: [] }, levelNames: new Map() }),
    );
    return () => {
      alive = false;
    };
  }, [wanted, data]);

  return useMemo(
    () => ({
      loading: wanted && data === null,
      hits: data && wanted ? search(data.index, query, { limit: RESULT_LIMIT }) : [],
      levelName: (buildingId, levelId) => data?.levelNames.get(`${buildingId}/${levelId}`),
    }),
    [data, query, wanted],
  );
}
