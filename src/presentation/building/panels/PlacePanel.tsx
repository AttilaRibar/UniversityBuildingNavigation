"use client";

import { useState } from "react";
import type { IndoorBuilding, Unit } from "@/domain/indoor/model";
import type { Route } from "@/domain/routing";
import { Button } from "@/presentation/ui/Button";
import { Close, Navigation, Share } from "@/presentation/ui/icons";
import { formatDistance, formatDuration } from "../stepText";
import { useUnitText } from "./useUnitText";

export interface PlacePanelProps {
  building: IndoorBuilding;
  unit: Unit;
  route: Route | null;
  originName: string;
  stepFree: boolean;
  onRoute: () => void;
  onChangeOrigin: () => void;
  onClose: () => void;
  closeLabel: string;
}

/** The card of a selected room: what it is, where it is, and the button that starts the route. */
export function PlacePanel({ building, unit, route, originName, stepFree, onRoute, onChangeOrigin, onClose, closeLabel }: PlacePanelProps) {
  const { title, subtitle, m } = useUnitText(building);
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const data = { title: title(unit), url: window.location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(data.url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // The share sheet was dismissed: nothing to do.
    }
  };

  return (
    <div className="animate-rise px-5 pb-8">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-5xl leading-none font-extrabold tracking-tight">{title(unit)}</h2>
          <p className="mt-2 text-base text-ink-soft">
            {subtitle(unit)}
            {unit.occupant ? ` · ${unit.occupant}` : ""}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label={closeLabel} className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-2 hover:bg-line">
          <Close />
        </button>
      </div>

      <dl className="mt-4 flex gap-6">
        {unit.capacity ? (
          <div>
            <dt className="text-xs text-muted">{m.place.capacity}</dt>
            <dd className="font-extrabold">{m.place.seats(unit.capacity)}</dd>
          </div>
        ) : null}
        <div className="min-w-0">
          <dt className="text-xs text-muted">{m.place.startFrom}</dt>
          <dd className="flex items-center gap-2 font-extrabold">
            <span className="truncate">{originName}</span>
            <button type="button" onClick={onChangeOrigin} className="shrink-0 rounded-md px-1.5 py-1 text-sm font-bold text-ink underline decoration-accent decoration-2 underline-offset-2 hover:bg-surface-2">
              {m.place.change}
            </button>
          </dd>
        </div>
      </dl>

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
        {copied ? m.place.linkCopied : ""}
      </p>
      {unit.accuracy === "estimated" && unit.ref ? <p className="text-xs text-muted">{m.place.estimated}</p> : null}
    </div>
  );
}
