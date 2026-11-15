"use client";

import type { Route } from "@/domain/routing";
import { Button } from "@/presentation/ui/Button";
import { ArrowLeft, ArrowRight, Close, Flag, Wheelchair } from "@/presentation/ui/icons";
import type { BuildingMessages } from "@/presentation/i18n/messages/building";
import { StepIconView } from "../StepIconView";
import { formatDistance, formatDuration, type NavStep, type StepCard } from "../stepText";

export interface RoutePanelProps {
  m: BuildingMessages;
  route: Route;
  steps: readonly NavStep[];
  cards: readonly StepCard[];
  stepIndex: number | null;
  heading: string;
  stepFree: boolean;
  onStep: (index: number | null) => void;
  onToggleStepFree: () => void;
  onEnd: () => void;
  onArrived: () => void;
}

const remainingFrom = (steps: readonly NavStep[], index: number): number =>
  steps.slice(index).reduce((sum, step) => sum + (step.type === "depart" || step.type === "turn" ? step.distance : 0), 0);

/** Sheet content while a route is shown: controls for stepping through it and the full text list. */
export function RoutePanel({ m, route, steps, cards, stepIndex, heading, stepFree, onStep, onToggleStepFree, onEnd, onArrived }: RoutePanelProps) {
  const last = steps.length - 1;
  const summary = m.route.summary(formatDistance(route.distance, m), formatDuration(route.duration, m));

  return (
    <div className="px-5 pb-8">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg leading-tight font-extrabold">{stepIndex === null ? heading : m.route.stepOf(stepIndex + 1, steps.length)}</p>
          <p className="text-sm font-semibold text-muted">{stepIndex === null ? summary : m.route.remaining(formatDistance(remainingFrom(steps, stepIndex), m))}</p>
        </div>
        <button type="button" onClick={onEnd} aria-label={m.route.end} className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-2 hover:bg-line">
          <Close />
        </button>
      </div>

      <div className="mt-3 flex gap-2.5">
        {stepIndex === null ? (
          <Button size="lg" className="flex-1" icon={<ArrowRight />} onClick={() => onStep(0)}>
            {m.route.start}
          </Button>
        ) : (
          <>
            <Button size="lg" variant="secondary" aria-label={m.route.previous} onClick={() => onStep(stepIndex === 0 ? null : stepIndex - 1)}>
              <ArrowLeft />
            </Button>
            {stepIndex < last ? (
              <Button size="lg" className="flex-1" onClick={() => onStep(stepIndex + 1)}>
                {m.route.next}
                <ArrowRight />
              </Button>
            ) : (
              <Button size="lg" className="flex-1" icon={<Flag />} onClick={onArrived}>
                {m.route.finish}
              </Button>
            )}
          </>
        )}
      </div>

      <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-card bg-surface-2 p-3">
        <span className="flex items-center gap-3">
          <Wheelchair className="shrink-0" />
          <span>
            <span className="block font-extrabold">{m.route.stepFree}</span>
            <span className="block text-sm text-muted">{m.route.stepFreeHint}</span>
          </span>
        </span>
        <input type="checkbox" role="switch" checked={stepFree} onChange={onToggleStepFree} className="peer sr-only" />
        <span className="relative h-7 w-12 shrink-0 rounded-full bg-line transition-colors duration-200 peer-checked:bg-ink peer-focus-visible:outline-3 peer-focus-visible:outline-ink after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform after:duration-200 peer-checked:after:translate-x-5 peer-checked:after:bg-accent" />
      </label>

      <h3 className="mt-5 mb-1 text-xs font-bold tracking-wide text-muted uppercase">{m.route.allSteps}</h3>
      <ol>
        {cards.map((card, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => onStep(i)}
              aria-current={stepIndex === i ? "step" : undefined}
              className={`flex w-full items-center gap-3 rounded-card px-2 py-2 text-left transition-colors duration-150 ${stepIndex === i ? "bg-accent/35" : "hover:bg-surface-2"}`}
            >
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${stepIndex === i ? "bg-ink text-accent" : "bg-surface-2 text-ink"}`}>
                <StepIconView icon={card.icon} size={20} />
              </span>
              <span className="min-w-0">
                <span className="block leading-tight font-bold">{card.title}</span>
                {card.subtitle ? <span className="block text-sm text-muted">{card.subtitle}</span> : null}
              </span>
            </button>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs text-muted">{m.route.emergency}</p>
    </div>
  );
}
