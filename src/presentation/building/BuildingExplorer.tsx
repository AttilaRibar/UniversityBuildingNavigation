"use client";

import { useEffect, useState } from "react";
import { loadIndoorBuilding, type IndoorBuildingBundle } from "@/data/buildings";
import { LogoMark } from "@/presentation/brand/Logo";
import { useMessages } from "@/presentation/i18n/I18nProvider";
import { commonEn, commonHu } from "@/presentation/i18n/messages/common";
import { BuildingScreen } from "./BuildingScreen";

/** Loads a building's indoor data (its own code-split chunk) and shows the indoor screen. */
export function BuildingExplorer({ buildingId }: { buildingId: string }) {
  const common = useMessages(commonHu, commonEn);
  const [bundle, setBundle] = useState<IndoorBuildingBundle | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadIndoorBuilding(buildingId).then((loaded) => {
      if (!cancelled) setBundle(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [buildingId]);

  if (!bundle) {
    return (
      <main className="app-viewport flex flex-col items-center justify-center gap-3" aria-busy="true">
        <LogoMark size={56} className="animate-pulse" />
        <p className="font-bold text-ink-soft">{common.loading}</p>
      </main>
    );
  }
  return <BuildingScreen bundle={bundle} />;
}
