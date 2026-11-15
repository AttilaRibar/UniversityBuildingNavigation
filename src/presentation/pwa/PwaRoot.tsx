"use client";

import { useMessages } from "@/presentation/i18n/I18nProvider";
import { pwaEn, pwaHu } from "@/presentation/i18n/messages/pwa";
import { useOnlineStatus } from "./useOnlineStatus";
import { useServiceWorker } from "./useServiceWorker";

/**
 * Mounted once in the root layout: registers the service worker and shows
 * the update toast and the offline chip at the top centre (clear of bottom sheets).
 */
export function PwaRoot() {
  const m = useMessages(pwaHu, pwaEn);
  const online = useOnlineStatus();
  const { updateReady, applyUpdate } = useServiceWorker();

  if (online && !updateReady) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-4"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.5rem)" }}
    >
      {!online && (
        <div
          role="status"
          className="pointer-events-auto animate-fade rounded-chip bg-ink px-3 py-1.5 text-xs font-semibold text-white shadow-float"
        >
          {m.offlineChip}
        </div>
      )}
      {updateReady && (
        <div
          role="alert"
          className="pointer-events-auto flex animate-pop items-center gap-3 rounded-card bg-ink py-2 pl-4 pr-2 text-sm text-white shadow-float"
        >
          <span>{m.updateAvailable}</span>
          <button
            type="button"
            onClick={applyUpdate}
            className="rounded-chip bg-accent px-3 py-1.5 font-bold text-ink active:bg-accent-deep"
          >
            {m.update}
          </button>
        </div>
      )}
    </div>
  );
}
