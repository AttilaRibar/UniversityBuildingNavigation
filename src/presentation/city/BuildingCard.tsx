"use client";

import { motion } from "motion/react";
import { useSyncExternalStore, type Ref } from "react";
import { track } from "@/application/analytics";
import { buildDirectionsUrl, detectMapsPlatform, type MapsPlatform } from "@/application/directions";
import { buildingHref } from "@/application/links";
import type { CampusBuilding } from "@/domain/campus/model";
import { facultyByAbbr } from "@/data/campus";
import { useI18n, useMessages } from "@/presentation/i18n/I18nProvider";
import { cityEn, cityHu } from "@/presentation/i18n/messages/city";
import { LinkButton } from "@/presentation/ui/Button";
import { ArrowLeft, Info, Layers, Navigation, Pin } from "@/presentation/ui/icons";
import { CodeBadge, ColorDots } from "./BuildingRow";

const noSubscription = () => () => {};

/** The phone's own maps app; decided on the client, Google Maps for the prerender. */
function useMapsPlatform(): MapsPlatform {
  return useSyncExternalStore(
    noSubscription,
    () => detectMapsPlatform(navigator.userAgent, navigator.maxTouchPoints),
    () => "google",
  );
}

/** Title row shown in the sheet's always-visible header while a building is open. */
export function BuildingCardHeader({
  building,
  onClose,
  titleRef,
}: {
  building: CampusBuilding;
  onClose: () => void;
  titleRef: Ref<HTMLHeadingElement>;
}) {
  const { text } = useI18n();
  const m = useMessages(cityHu, cityEn);
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onClose}
        aria-label={m.backToList}
        className="-ml-1 grid size-11 shrink-0 place-items-center rounded-full text-ink transition-colors hover:bg-surface-2 active:scale-95"
      >
        <ArrowLeft />
      </button>
      <motion.h2
        key={building.id}
        ref={titleRef}
        tabIndex={-1}
        // Focus lands here for screen readers only; a ring around a heading would just look like a bug.
        style={{ outline: "none" }}
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 34 }}
        className="flex min-w-0 flex-1 items-center gap-2 text-[24px] leading-tight font-extrabold tracking-tight text-ink"
      >
        <span className="truncate">{text(building.name)}</span>
        {building.code ? <CodeBadge code={building.code} className="h-7 text-[15px]" /> : null}
      </motion.h2>
    </div>
  );
}

const stagger = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.045, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 14 },
  shown: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 380, damping: 32 } },
} as const;

/** Details and actions of the selected building. */
export function BuildingCard({ building }: { building: CampusBuilding }) {
  const { text } = useI18n();
  const m = useMessages(cityHu, cityEn);
  const platform = useMapsPlatform();
  const directions = buildDirectionsUrl({ location: building.location, label: text(building.name) }, platform);
  const faculties = building.faculties.flatMap((abbr) => facultyByAbbr(abbr) ?? []);

  const navigate = (
    <LinkButton
      href={directions}
      external
      variant={building.hasIndoorMap ? "secondary" : "primary"}
      size="lg"
      icon={<Navigation />}
      aria-label={`${m.navigate} – ${m.navigateHint}`}
      onClick={() => track("directions_opened", { building: building.id, platform })}
      className="w-full"
    >
      {m.navigate}
    </LinkButton>
  );

  return (
    <motion.div key={building.id} variants={stagger} initial="hidden" animate="shown" className="px-2 pt-1">
      <motion.p variants={item} className="text-[15px] leading-snug text-ink-soft">
        <span className="font-bold text-ink">{m.kind[building.kind]}</span>
        {" • "}
        {text(building.description)}
      </motion.p>

      <motion.div variants={item} className="mt-4 flex flex-col gap-2.5">
        {building.hasIndoorMap ? (
          <LinkButton href={buildingHref(building.id)} size="lg" icon={<Layers />} className="w-full">
            {m.indoorMap}
          </LinkButton>
        ) : null}
        {navigate}
        {building.hasIndoorMap ? null : <p className="px-1 text-sm text-muted">{m.indoorMapComing}</p>}
      </motion.div>

      {faculties.length > 0 ? (
        <motion.section variants={item} className="mt-5" aria-labelledby="card-faculties">
          <h3 id="card-faculties" className="text-xs font-extrabold tracking-[0.08em] text-muted uppercase">
            {m.faculties}
          </h3>
          <ul className="mt-1.5">
            {faculties.map((f) => {
              const label = (
                <>
                  <ColorDots colors={[f.color]} size={12} />
                  <span className="min-w-0 flex-1">
                    <span className="block leading-snug font-bold text-ink">{text(f.name)}</span>
                    <span className="text-sm text-muted">{f.abbr}</span>
                  </span>
                </>
              );
              return (
                <li key={f.abbr}>
                  {f.url ? (
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="-mx-1 flex min-h-11 items-center gap-3 rounded-xl px-1 py-1.5 transition-colors hover:bg-surface-2"
                    >
                      {label}
                      <span className="sr-only">{m.opensInNewTab}</span>
                    </a>
                  ) : (
                    <div className="flex min-h-11 items-center gap-3 py-1.5">{label}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </motion.section>
      ) : null}

      <motion.div variants={item} className="mt-4">
        <h3 className="sr-only">{m.address}</h3>
        <p className="flex items-start gap-3 text-[15px] leading-snug text-ink">
          <Pin size={20} className="mt-px shrink-0 text-muted" />
          <span>
            {building.address}
            <span className="block text-sm text-muted">{building.district}</span>
          </span>
        </p>
      </motion.div>

      {building.verified ? null : (
        <motion.p variants={item} className="mt-3 flex items-start gap-3 text-sm text-muted">
          <Info size={20} className="shrink-0" />
          {m.approximateFootprint}
        </motion.p>
      )}
    </motion.div>
  );
}
