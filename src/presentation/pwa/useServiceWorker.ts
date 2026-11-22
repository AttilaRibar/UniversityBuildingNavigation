"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { navigationLog } from "@/presentation/logging/navigationLog";

/**
 * Registers `/sw.js` (production only) and reports when an updated worker is waiting.
 * `applyUpdate` asks it to take over; the page reloads once when it does.
 */
export function useServiceWorker(): { updateReady: boolean; applyUpdate: () => void } {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const reloading = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const container = navigator.serviceWorker;
    // Only an update (page already controlled) deserves a toast; the very first install does not.
    const hadController = container.controller !== null;

    const watch = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting && container.controller) setWaiting(registration.waiting);
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && container.controller) setWaiting(worker);
        });
      });
    };

    const onControllerChange = () => {
      // Guard: a first-time clients.claim() must not reload, and we reload at most once.
      if (!hadController || reloading.current) return;
      reloading.current = true;
      window.location.reload();
    };
    container.addEventListener("controllerchange", onControllerChange);

    container
      .register("/sw.js", { scope: "/" })
      .then(watch)
      .catch(() => {
        // Registration failure only costs offline support.
        navigationLog.serviceWorkerRegistrationFailed();
      });

    return () => container.removeEventListener("controllerchange", onControllerChange);
  }, []);

  const applyUpdate = useCallback(() => {
    waiting?.postMessage({ type: "SKIP_WAITING" });
  }, [waiting]);

  return { updateReady: waiting !== null, applyUpdate };
}
