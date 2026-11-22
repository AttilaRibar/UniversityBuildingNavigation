import posthog from "posthog-js";

export const navigationLog = {
  cityMapUnavailable: (status: "degraded" | "failed") =>
    posthog.logger.warn("city map unavailable", {
      component: "city_map",
      map_status: status,
    }),
  indoorMapUnavailable: (buildingId: string) =>
    posthog.logger.warn("indoor map unavailable", {
      component: "indoor_map",
      building_id: buildingId,
    }),
  serviceWorkerRegistrationFailed: () =>
    posthog.logger.warn("service worker registration failed", {
      component: "service_worker",
    }),
};
