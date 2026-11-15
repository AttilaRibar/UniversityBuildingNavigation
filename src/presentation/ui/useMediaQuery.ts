"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Live `matchMedia` result. The server render (and hydration) assumes `false`,
 * i.e. the phone layout, which is what most visitors use.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Width from which sheets become side panels. Matches Tailwind's `md`. */
export const DESKTOP_QUERY = "(min-width: 768px)";
