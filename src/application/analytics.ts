/**
 * Product analytics behind a small, typed facade.
 *
 * Call sites only know the event catalogue below and `track()`. The vendor adapter
 * (PostHog, see `src/infrastructure/analytics/posthog.ts`) is attached at runtime by
 * `src/instrumentation-client.ts`, after the page is interactive. Until then events
 * are buffered; when analytics is off (no key, Do Not Track, Global Privacy Control,
 * or the visitor opted out) they are dropped and nothing leaves the browser.
 *
 * Rules for event properties: no personal data, no free text beyond the search query
 * (trimmed and capped), ids of rooms and buildings rather than display names.
 */

export type MapScreen = "city" | "building" | "entrance";

/** Every event the app sends, with its properties. Adding an event starts here. */
export interface AnalyticsEvents {
  /** Debounced: sent once the visitor stops typing. */
  search_performed: { screen: "city" | "building" | "origin"; query: string; rooms: number; buildings?: number };
  building_selected: { building: string; source: "map" | "list" | "search" };
  room_selected: { building: string; room: string; source: "search" | "list" | "map" | "link" | "nearest" };
  nearest_requested: { building: string; category: string; found: boolean };
  origin_changed: { building: string; origin_type: "anchor" | "unit"; origin: string };
  route_started: { building: string; room: string; origin: string; step_free: boolean; distance_m: number; steps: number };
  route_completed: { building: string; room: string; step_free: boolean };
  route_not_found: { building: string; room: string; origin: string; step_free: boolean };
  step_free_toggled: { building: string; enabled: boolean };
  directions_opened: { building: string; platform: "apple" | "google" };
  link_shared: { building: string; room: string; method: "native" | "clipboard" };
  problem_report_opened: { building: string; room: string };
  language_changed: { locale: "hu" | "en" };
  install_prompt_answered: { outcome: "accepted" | "dismissed" };
  map_unavailable: { screen: MapScreen; reason: "webgl" | "tiles" | "failed" };
  building_load_failed: { building: string };
}

export type AnalyticsEventName = keyof AnalyticsEvents;

/** What a vendor adapter has to provide. */
export interface AnalyticsSink {
  capture(name: string, properties: Record<string, unknown>): void;
  captureException(error: unknown, properties?: Record<string, unknown>): void;
  /** Stops the vendor's own automatic capture (page leave, web vitals, uncaught errors). */
  optOut?(): void;
}

type Pending = { kind: "event"; name: string; properties: Record<string, unknown> } | { kind: "exception"; error: unknown; properties?: Record<string, unknown> };

/** Events fired before the adapter loads; beyond this the oldest are dropped. */
const BUFFER_LIMIT = 50;

let sink: AnalyticsSink | null = null;
let enabled = true;
let buffer: Pending[] = [];

function enqueue(item: Pending): void {
  if (!enabled) return;
  if (sink) {
    deliver(sink, item);
    return;
  }
  buffer.push(item);
  if (buffer.length > BUFFER_LIMIT) buffer = buffer.slice(-BUFFER_LIMIT);
}

function deliver(target: AnalyticsSink, item: Pending): void {
  // Analytics must never break the app.
  try {
    if (item.kind === "event") target.capture(item.name, item.properties);
    else target.captureException(item.error, item.properties);
  } catch {
    /* ignore */
  }
}

/** Records a product event. Safe to call anywhere, any time; never throws. */
export function track<K extends AnalyticsEventName>(name: K, properties: AnalyticsEvents[K]): void {
  enqueue({ kind: "event", name, properties: { ...properties } });
}

/** Reports a handled error (error boundaries, failed loads). */
export function trackException(error: unknown, properties?: Record<string, unknown>): void {
  enqueue({ kind: "exception", error, properties });
}

/** Attaches the vendor adapter and flushes what was buffered so far. */
export function attachAnalyticsSink(next: AnalyticsSink): void {
  if (!enabled) return;
  sink = next;
  const pending = buffer;
  buffer = [];
  for (const item of pending) deliver(next, item);
}

/** Turns analytics off for this page load: the buffer is dropped and later events are ignored. */
export function disableAnalytics(): void {
  try {
    sink?.optOut?.();
  } catch {
    /* ignore */
  }
  enabled = false;
  sink = null;
  buffer = [];
}

/** Search queries are sent trimmed, lower-cased and capped, so a pasted paragraph never ends up in analytics. */
export function analyticsQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 40);
}

/** For tests only. */
export function resetAnalyticsForTests(): void {
  sink = null;
  enabled = true;
  buffer = [];
}
