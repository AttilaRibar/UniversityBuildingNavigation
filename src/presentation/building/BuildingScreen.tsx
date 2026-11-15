"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import type { IndoorBuildingBundle } from "@/data/buildings";
import { useI18n, useMessages } from "@/presentation/i18n/I18nProvider";
import { buildingEn, buildingHu } from "@/presentation/i18n/messages/building";
import { commonEn, commonHu } from "@/presentation/i18n/messages/common";
import { ArrowLeft } from "@/presentation/ui/icons";
import { LanguageToggle } from "@/presentation/ui/LanguageToggle";
import { SearchField } from "@/presentation/ui/SearchField";
import { Sheet, type SheetInsets, type SheetSnap } from "@/presentation/ui/Sheet";
import { BuildingCanvas } from "./BuildingCanvas";
import { InstructionBanner } from "./InstructionBanner";
import { LevelSwitcher } from "./LevelSwitcher";
import { ExplorePanel } from "./panels/ExplorePanel";
import { OriginPicker } from "./panels/OriginPicker";
import { PlacePanel } from "./panels/PlacePanel";
import { RoutePanel } from "./panels/RoutePanel";
import type { SceneLabels } from "./scene/BuildingScene";
import { describeStep, pointName, unitTitle, type StepTextContext } from "./stepText";
import { positionOf, routeLevelIds, sceneViewOf, useNavigator, type NavigatorPhase } from "./useNavigator";

/** MapLibre needs `window` and WebGL, and only routes from an entrance use it here. */
const EntranceMap = dynamic(() => import("./EntranceMap"), { ssr: false });

const TOP_BAR = 68;
const BANNER = 104;
const SWITCHER = 60;

/** The indoor map screen: 3D model, floor picker, and a sheet that changes with the navigation phase. */
export function BuildingScreen({ bundle }: { bundle: IndoorBuildingBundle }) {
  const { building } = bundle;
  const { text } = useI18n();
  const m = useMessages(buildingHu, buildingEn);
  const common = useMessages(commonHu, commonEn);
  const nav = useNavigator(building);
  const { state } = nav;

  const [query, setQuery] = useState("");
  // The sheet's resting height follows the phase: a room card needs room, a route should show the map.
  const [sheet, setSheet] = useState<{ phase: NavigatorPhase; snap: SheetSnap }>({ phase: state.phase, snap: "peek" });
  if (sheet.phase !== state.phase) setSheet({ phase: state.phase, snap: state.phase === "place" ? "half" : "peek" });
  const snap = sheet.snap;
  const setSnap = useCallback((next: SheetSnap) => setSheet((current) => ({ ...current, snap: next })), []);
  const [pickingOrigin, setPickingOrigin] = useState(false);
  const [sheetInsets, setSheetInsets] = useState<SheetInsets>({ left: 0, bottom: 0 });
  const [webglFailed, setWebglFailed] = useState(false);

  const labels = useMemo<SceneLabels>(
    () => ({
      unit: (unit) => {
        if (unit.category === "service") return null;
        if (unit.category === "elevator") return m.lift;
        if (unit.category === "stairs") return m.stairs;
        return unit.ref ?? (unit.name ? text(unit.name) : null);
      },
      level: (level) => text(level.name),
      origin: m.originMarker,
    }),
    [m, text],
  );

  const textContext = useMemo<StepTextContext | null>(
    () => (state.destination ? { building, messages: m, text, origin: state.origin, destination: { type: "unit", unitId: state.destination.id } } : null),
    [building, m, text, state.origin, state.destination],
  );
  const cards = useMemo(() => (textContext ? state.steps.map((_, i) => describeStep(state.steps, i, textContext)) : []), [state.steps, textContext]);

  const view = useMemo(() => sceneViewOf(state), [state.phase, state.destination, state.route, state.steps, state.stepIndex, state.levelId]); // eslint-disable-line react-hooks/exhaustive-deps -- `state` is a fresh object every render
  const sceneRoute = useMemo(() => {
    if (state.phase !== "route" || !state.route) return null;
    const origin = positionOf(state.origin, building);
    return origin ? { legs: state.route.legs, origin } : null;
  }, [state.phase, state.route, state.origin, building]);

  const showBanner = state.phase === "route" && state.stepIndex !== null;
  const currentStep = state.stepIndex !== null ? state.steps[state.stepIndex] : undefined;
  const approach = currentStep?.type === "approach" ? currentStep : null;
  const insets = useMemo(
    () => ({ top: showBanner ? BANNER : TOP_BAR, right: SWITCHER, bottom: sheetInsets.bottom, left: sheetInsets.left }),
    [showBanner, sheetInsets],
  );

  const select = useCallback(
    (unitId: string) => {
      nav.selectDestination(unitId);
      setQuery("");
      setPickingOrigin(false);
      setSnap("half");
    },
    [nav, setSnap],
  );

  const activeLevelId =
    view.mode.type === "level" ? view.mode.levelId : view.mode.type === "route" ? view.mode.focusLevelId : null;
  const originName = textContext ? pointName(state.origin, textContext) : "";

  const header =
    state.phase === "explore" ? (
      <SearchField
        value={query}
        onChange={(value) => {
          setQuery(value);
          if (value) setSnap("full");
        }}
        onFocus={() => setSnap("full")}
        placeholder={common.searchPlaceholder}
        ariaLabel={common.searchPlaceholder}
      />
    ) : undefined;

  return (
    <main className="app-viewport">
      {webglFailed ? (
        <p className="absolute inset-x-4 top-24 rounded-card bg-surface p-4 text-center font-semibold shadow-float md:left-[440px]">{m.noWebGl}</p>
      ) : (
        <BuildingCanvas
          building={building}
          mode={view.mode}
          focus={view.focus}
          labels={labels}
          destinationUnitId={state.destination?.id ?? null}
          originUnitId={state.origin.type === "unit" && state.phase !== "explore" ? state.origin.unitId : null}
          route={sceneRoute}
          insets={insets}
          onUnitTap={select}
          onLevelTap={nav.showLevel}
          onError={() => setWebglFailed(true)}
          ariaLabel={text(building.name)}
        />
      )}

      {approach ? (
        <EntranceMap building={building} anchorId={approach.anchorId} label={m.entranceMarker} insets={{ ...insets, right: 0 }} />
      ) : null}

      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
        style={{ paddingLeft: sheetInsets.left + 12 }}
      >
        {showBanner && state.stepIndex !== null ? (
          <div className="min-w-0 flex-1">
            <InstructionBanner card={cards[state.stepIndex]} stepKey={state.stepIndex} />
          </div>
        ) : (
          <>
            <Link href="/" aria-label={m.backToCity} className="pointer-events-auto flex size-11 shrink-0 items-center justify-center rounded-full bg-surface shadow-float ring-1 ring-line transition-transform active:scale-95">
              <ArrowLeft />
            </Link>
            <p className="pointer-events-auto flex h-11 min-w-0 items-center rounded-full bg-surface px-4 font-extrabold shadow-float ring-1 ring-line">
              <span className="truncate">{text(building.name)}</span>
            </p>
            <LanguageToggle className="pointer-events-auto ml-auto" />
          </>
        )}
      </div>

      <div
        className={`pointer-events-none absolute right-3 z-10 flex flex-col items-end transition-opacity duration-300 ${approach ? "invisible opacity-0" : ""}`}
        style={{ top: (showBanner ? BANNER : TOP_BAR) + 12 }}
      >
        <LevelSwitcher
          levels={building.levels}
          activeLevelId={activeLevelId}
          routeLevelIds={state.phase === "route" && state.route ? routeLevelIds(state.route) : []}
          onSelect={nav.showLevel}
          disabled={state.phase === "route"}
          labels={{ group: m.levelSwitcher, allLevels: m.allLevels, level: (level) => text(level.name) }}
        />
      </div>

      <Sheet
        snap={snap}
        onSnapChange={setSnap}
        ariaLabel={text(building.name)}
        header={header}
        peekHeight={state.phase === "route" ? 176 : 152}
        onInsetsChange={setSheetInsets}
      >
        {pickingOrigin ? (
          <OriginPicker
            building={building}
            backLabel={common.back}
            onCancel={() => setPickingOrigin(false)}
            onPick={(point) => {
              nav.setOrigin(point);
              setPickingOrigin(false);
            }}
          />
        ) : state.phase === "route" && state.route && state.destination && textContext ? (
          <RoutePanel
            m={m}
            route={state.route}
            steps={state.steps}
            cards={cards}
            stepIndex={state.stepIndex}
            heading={`${originName} → ${unitTitle(state.destination, textContext)}`}
            stepFree={state.stepFree}
            onStep={(index) => {
              nav.goToStep(index);
              setSnap("peek");
            }}
            onToggleStepFree={nav.toggleStepFree}
            onEnd={nav.endRoute}
            onArrived={nav.clearDestination}
          />
        ) : state.phase !== "explore" && state.destination ? (
          <PlacePanel
            building={building}
            unit={state.destination}
            route={state.route}
            originName={originName}
            stepFree={state.stepFree}
            closeLabel={common.close}
            onChangeOrigin={() => {
              setPickingOrigin(true);
              setSnap("full");
            }}
            onClose={nav.clearDestination}
            onRoute={nav.startRoute}
          />
        ) : (
          <ExplorePanel building={building} query={query} onSelect={select} onNearest={nav.selectNearest} />
        )}
      </Sheet>
    </main>
  );
}
