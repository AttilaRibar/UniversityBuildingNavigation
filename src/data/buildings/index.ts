import type { IndoorBuilding } from "@/domain/indoor/model";

export interface IndoorBuildingBundle {
  building: IndoorBuilding;
  /** Building code used in timetables, e.g. "BA". */
  code: string;
  attribution: string;
}

/**
 * Buildings that have indoor data. Each one is a separate chunk so the phone
 * only downloads the building the student actually opens.
 */
const loaders: Record<string, () => Promise<IndoorBuildingBundle>> = {
  ba: () => import("./ba"),
};

export const INDOOR_BUILDING_IDS: readonly string[] = Object.keys(loaders);

export const hasIndoorData = (buildingId: string): boolean => buildingId in loaders;

export function loadIndoorBuilding(buildingId: string): Promise<IndoorBuildingBundle> {
  const loader = loaders[buildingId];
  if (!loader) return Promise.reject(new Error(`No indoor data for building "${buildingId}"`));
  return loader();
}
