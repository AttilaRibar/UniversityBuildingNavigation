"use client";

import { useEffect } from "react";
import { analyticsQuery, track, type AnalyticsEvents } from "@/application/analytics";

/** How long the query must stay unchanged before it counts as a search (not every keystroke). */
const SETTLE_MS = 1200;

/**
 * Sends `search_performed` once the visitor stops typing. `counts` is null while
 * results are still loading, so a search is reported with its real result count.
 */
export function useTrackedSearch(
  screen: AnalyticsEvents["search_performed"]["screen"],
  query: string,
  counts: { rooms: number; buildings?: number } | null,
): void {
  const rooms = counts?.rooms;
  const buildings = counts?.buildings;
  useEffect(() => {
    const normalized = analyticsQuery(query);
    if (!normalized || rooms === undefined) return;
    const timer = window.setTimeout(() => track("search_performed", { screen, query: normalized, rooms, buildings }), SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [screen, query, rooms, buildings]);
}
