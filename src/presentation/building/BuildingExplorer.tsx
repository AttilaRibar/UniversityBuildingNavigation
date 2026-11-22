"use client";

import { useEffect, useState } from "react";
import { track, trackException } from "@/application/analytics";
import { loadIndoorBuilding, type IndoorBuildingBundle } from "@/data/buildings";
import { LogoMark } from "@/presentation/brand/Logo";
import { useMessages } from "@/presentation/i18n/I18nProvider";
import { buildingEn, buildingHu } from "@/presentation/i18n/messages/building";
import { commonEn, commonHu } from "@/presentation/i18n/messages/common";
import { Button, LinkButton } from "@/presentation/ui/Button";
import { BuildingScreen } from "./BuildingScreen";

type LoadState = { status: "loading" } | { status: "ready"; bundle: IndoorBuildingBundle } | { status: "failed" };

/**
 * Loads a building's indoor data (its own code-split chunk) and shows the indoor screen.
 * The chunk can fail to arrive (offline and not cached yet, a deploy replaced it), so the
 * screen offers a retry instead of spinning forever.
 */
export function BuildingExplorer({ buildingId }: { buildingId: string }) {
  const common = useMessages(commonHu, commonEn);
  const m = useMessages(buildingHu, buildingEn);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadIndoorBuilding(buildingId).then(
      (bundle) => {
        if (!cancelled) setState({ status: "ready", bundle });
      },
      (error: unknown) => {
        if (cancelled) return;
        setState({ status: "failed" });
        track("building_load_failed", { building: buildingId });
        trackException(error, { building: buildingId });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [buildingId, attempt]);

  if (state.status === "ready") return <BuildingScreen bundle={state.bundle} />;

  if (state.status === "failed") {
    return (
      <main className="app-viewport flex flex-col items-center justify-center gap-4 px-6 text-center">
        <LogoMark size={56} />
        <p className="max-w-sm font-bold text-ink-soft">{m.loadFailed}</p>
        <div className="flex flex-wrap justify-center gap-2.5">
          <Button
            onClick={() => {
              setState({ status: "loading" });
              setAttempt((n) => n + 1);
            }}
          >
            {m.retry}
          </Button>
          <LinkButton href="/" variant="secondary">
            {common.home}
          </LinkButton>
        </div>
      </main>
    );
  }

  return (
    <main className="app-viewport flex flex-col items-center justify-center gap-3" aria-busy="true">
      <LogoMark size={56} className="animate-pulse" />
      <p className="font-bold text-ink-soft">{common.loading}</p>
    </main>
  );
}
