"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { track } from "@/application/analytics";
import { campusBuildingById } from "@/data/campus";
import { Logo } from "@/presentation/brand/Logo";
import { useMessages } from "@/presentation/i18n/I18nProvider";
import { cityEn, cityHu } from "@/presentation/i18n/messages/city";
import { commonEn, commonHu } from "@/presentation/i18n/messages/common";
import { FooterLinks } from "@/presentation/ui/FooterLinks";
import { Info } from "@/presentation/ui/icons";
import { LanguageToggle } from "@/presentation/ui/LanguageToggle";
import { SearchField } from "@/presentation/ui/SearchField";
import { Sheet, type SheetInsets, type SheetSnap } from "@/presentation/ui/Sheet";
import { BuildingCard, BuildingCardHeader } from "./BuildingCard";
import { BuildingList } from "./BuildingList";
import type { CityMapStatus, MapObscured } from "./CityMap";
import { SearchResults } from "./SearchResults";

/** MapLibre needs `window` and WebGL, so the map is only ever rendered in the browser. */
const CityMap = dynamic(() => import("./CityMap"), { ssr: false });

/** City overview: the 3D campus map with the building list / search / details sheet over it. */
export function CityOverview() {
  const m = useMessages(cityHu, cityEn);
  const c = useMessages(commonHu, commonEn);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [snap, setSnap] = useState<SheetSnap>("peek");
  const [query, setQuery] = useState("");
  const [obscured, setObscured] = useState<MapObscured>({ top: 0, left: 0, bottom: 152 });
  const [mapStatus, setMapStatus] = useState<CityMapStatus | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const selected = selectedId ? campusBuildingById(selectedId) : undefined;

  const select = useCallback((id: string | null, source: "map" | "list" | "search" = "map") => {
    setSelectedId(id);
    if (id) {
      setSnap("half");
      track("building_selected", { building: id, source });
    }
  }, []);
  const selectFromList = useCallback((id: string) => select(id, "list"), [select]);
  const selectFromSearch = useCallback((id: string) => select(id, "search"), [select]);

  const closeCard = () => {
    setSelectedId(null);
    requestAnimationFrame(() => searchRef.current?.querySelector("input")?.focus());
  };

  const onInsetsChange = useCallback(
    (insets: SheetInsets) =>
      setObscured((prev) =>
        prev.left === insets.left && prev.bottom === insets.bottom ? prev : { top: 0, left: insets.left, bottom: insets.bottom },
      ),
    [],
  );

  useEffect(() => {
    if (selectedId) titleRef.current?.focus({ preventScroll: true });
  }, [selectedId]);

  useEffect(() => {
    if (mapStatus === "failed" || mapStatus === "degraded") {
      track("map_unavailable", { screen: "city", reason: mapStatus === "failed" ? "failed" : "tiles" });
    }
    // Without a map the list is the whole interface, so give it room.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to a map failure reported from outside React
    if (mapStatus === "failed") setSnap((s) => (s === "peek" ? "half" : s));
  }, [mapStatus]);

  const searching = query.trim() !== "";

  const header = selected ? (
    <BuildingCardHeader building={selected} onClose={closeCard} titleRef={titleRef} />
  ) : (
    <div ref={searchRef}>
      <SearchField
        value={query}
        onChange={(v) => {
          setQuery(v);
          if (v.trim() !== "") setSnap("full");
        }}
        onFocus={() => setSnap("full")}
        placeholder={c.searchPlaceholder}
        ariaLabel={m.searchLabel}
      />
    </div>
  );

  return (
    <MotionConfig reducedMotion="user">
      <main className="app-viewport bg-canvas">
        {mapStatus === "failed" ? null : (
          <CityMap selectedId={selectedId} onSelect={select} obscured={obscured} onStatusChange={setMapStatus} />
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-3 pt-[max(12px,env(safe-area-inset-top))] md:p-4">
          <div className="pointer-events-auto flex h-11 items-center rounded-full bg-surface/90 pr-4 pl-2 shadow-float ring-1 ring-line backdrop-blur-md animate-pop md:hidden">
            <Logo />
          </div>
          <LanguageToggle className="pointer-events-auto ml-auto animate-pop" />
        </div>

        <AnimatePresence>
          {mapStatus === "failed" || mapStatus === "degraded" ? (
            <motion.div
              role="status"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={
                "absolute top-[max(72px,calc(env(safe-area-inset-top)+64px))] right-3 left-3 z-10 mx-auto flex max-w-md items-start gap-3 " +
                "rounded-card bg-surface p-3.5 text-[15px] leading-snug text-ink shadow-float md:left-[432px]"
              }
            >
              <Info size={22} className="shrink-0 text-muted" />
              {mapStatus === "failed" ? m.mapFailed : m.mapDegraded}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <Sheet
          snap={snap}
          onSnapChange={setSnap}
          ariaLabel={m.sheetLabel}
          onInsetsChange={onInsetsChange}
          contentKey={selectedId ?? (searching ? "search" : "list")}
          header={
            <>
              <div className="hidden items-center pb-3 md:flex">
                <Logo />
              </div>
              {header}
            </>
          }
        >
          {selected ? (
            <BuildingCard building={selected} />
          ) : searching ? (
            <SearchResults query={query} onSelectBuilding={selectFromSearch} />
          ) : (
            <BuildingList onSelect={selectFromList} />
          )}
          <footer className="mt-6 border-t border-line px-2 pt-4 text-xs leading-relaxed text-muted">
            <p>{c.unofficial}</p>
            <p>{m.footerData}</p>
            <FooterLinks className="mt-1" />
          </footer>
        </Sheet>
      </main>
    </MotionConfig>
  );
}
