"use client";

import { useState } from "react";
import { track } from "@/application/analytics";
import { REPOSITORY_URL } from "@/application/app-info";
import { buildingHref, reportProblemHref } from "@/application/links";
import type { IndoorBuilding, Unit } from "@/domain/indoor/model";
import type { Route } from "@/domain/routing";
import { Button } from "@/presentation/ui/Button";
import { ChevronRight, Close, Navigation, Pin, Share } from "@/presentation/ui/icons";
import { formatDistance, formatDuration } from "../stepText";
import { useUnitText } from "./useUnitText";

export interface PlacePanelProps {
  building: IndoorBuilding;
  /** Short display name of the building, e.g. "BA épület". */
  buildingName: string;
  unit: Unit;
  route: Route | null;
  originName: string;
  stepFree: boolean;
  onRoute: () => void;
  onChangeOrigin: () => void;
  onClose: () => void;
  closeLabel: string;
}

type ShareStatus = "idle" | "copied" | "failed";

/** The card of a selected room: what it is, where it is, and the button that starts the route. */
export function PlacePanel({ building, buildingName, unit, route, originName, stepFree, onRoute, onChangeOrigin, onClose, closeLabel }: PlacePanelProps) {
  const { title, subtitle, m } = useUnitText(building);
  const [shareStatus, setShareStatus] = useState<ShareStatus>("idle");

  const flash = (status: ShareStatus) => {
    setShareStatus(status);
    window.setTimeout(() => setShareStatus("idle"), 2500);
  };

  const share = async () => {
    const data = { title: `${title(unit)} – ${buildingName}`, url: window.location.href };
    if (navigator.share) {
      try {
        await navigator.share(data);
        track("link_shared", { building: building.id, room: unit.id, method: "native" });
      } catch {
        // The share sheet was dismissed: nothing to do.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(data.url);
      track("link_shared", { building: building.id, room: unit.id, method: "clipboard" });
      flash("copied");
    } catch {
      // No clipboard access (insecure context, denied permission).
      flash("failed");
    }
  };

  const meta = [unit.occupant, unit.capacity ? `${m.place.capacity}: ${m.place.seats(unit.capacity)}` : null].filter(Boolean).join(" • ");
  const reportSubject = `${buildingName} – ${title(unit)}`;
  // The address bar is synced after render, so the exact page link is filled in on click.
  const reportHref = reportProblemHref(REPOSITORY_URL, { subject: reportSubject, pageUrl: buildingHref(building.id, { to: unit.id }) });

  return (
    <div className="animate-rise px-2 pb-8">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-5xl leading-none font-extrabold tracking-tight">{title(unit)}</h2>
          <p className="mt-2 text-base leading-snug text-ink-soft">{subtitle(unit)}</p>
          {meta ? <p className="mt-1 text-sm leading-snug text-muted">{meta}</p> : null}
        </div>
        <button type="button" onClick={onClose} aria-label={closeLabel} className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-2 hover:bg-line">
          <Close />
        </button>
      </div>

      <button
        type="button"
        onClick={onChangeOrigin}
        className="mt-4 flex w-full items-center gap-3 rounded-card bg-surface-2 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-line"
      >
        <Pin size={20} className="shrink-0 text-muted" />
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-muted">{m.place.startFrom}</span>
          <span className="block leading-snug font-extrabold">{originName}</span>
        </span>
        <span className="shrink-0 text-sm font-bold underline decoration-accent decoration-2 underline-offset-2">{m.place.change}</span>
        <ChevronRight size={18} className="-mr-1 shrink-0 text-muted" />
      </button>

      {route ? (
        <p className="mt-3 text-sm font-semibold text-ink-soft">{m.route.summary(formatDistance(route.distance, m), formatDuration(route.duration, m))}</p>
      ) : (
        <p role="alert" className="mt-3 rounded-card bg-surface-2 p-3 text-sm font-semibold">
          {stepFree ? m.place.noStepFreeRoute : m.place.noRoute}
        </p>
      )}

      <div className="mt-4 flex gap-2.5">
        <Button size="lg" className="flex-1 whitespace-nowrap" icon={<Navigation />} disabled={!route} onClick={onRoute}>
          {m.place.routeHere}
        </Button>
        <Button size="lg" variant="secondary" aria-label={m.place.share} onClick={share}>
          <Share />
        </Button>
      </div>
      <p aria-live="polite" className="mt-2 min-h-5 text-sm font-semibold text-ink-soft">
        {shareStatus === "copied" ? m.place.linkCopied : shareStatus === "failed" ? m.place.shareFailed : ""}
      </p>
      {unit.accuracy === "estimated" && unit.ref ? <p className="text-xs leading-relaxed text-muted">{m.place.estimated}</p> : null}
      <a
        href={reportHref}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => {
          e.currentTarget.href = reportProblemHref(REPOSITORY_URL, { subject: reportSubject, pageUrl: window.location.href });
          track("problem_report_opened", { building: building.id, room: unit.id });
        }}
        className="mt-2 inline-flex min-h-11 items-center text-xs font-bold text-ink-soft underline decoration-line decoration-2 underline-offset-2 hover:decoration-accent"
      >
        {m.place.reportProblem}
      </a>
    </div>
  );
}
