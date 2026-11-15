"use client";

import { animate, motion, useMotionValue, useReducedMotion, type ValueAnimationTransition } from "motion/react";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { useMessages } from "@/presentation/i18n/I18nProvider";
import { uiEn, uiHu } from "@/presentation/i18n/messages/ui";
import { DESKTOP_QUERY, useMediaQuery } from "./useMediaQuery";

export type SheetSnap = "peek" | "half" | "full";

/** Pixels of the viewport covered by the sheet (bottom) or the side panel (left). */
export interface SheetInsets {
  left: number;
  bottom: number;
}

export interface SheetProps {
  snap: SheetSnap;
  onSnapChange: (snap: SheetSnap) => void;
  ariaLabel: string;
  /** Always visible part under the grabber (e.g. the search box). */
  header?: ReactNode;
  children: ReactNode;
  /** Height of the "peek" state in px on phones. Default 152. */
  peekHeight?: number;
  /** Called whenever the covered area changes, so maps can keep their subject visible. */
  onInsetsChange?: (insets: SheetInsets) => void;
}

const SNAPS: readonly SheetSnap[] = ["peek", "half", "full"];
/** Map strip left visible above a fully open sheet, so the user never loses context. */
const TOP_GAP = 56;
const HALF_RATIO = 0.52;
const PANEL_WIDTH = 400;
const PANEL_MARGIN = 16;
/** Movement before a press on the handle becomes a drag (and stops being a click). */
const DRAG_THRESHOLD = 6;
/** px/ms; a flick faster than this always moves one snap in its direction. */
const FLICK_VELOCITY = 0.45;
const SPRING: ValueAnimationTransition<number> = { type: "spring", stiffness: 420, damping: 40, mass: 0.9 };
/** Far below any phone screen, so the server-rendered sheet starts hidden and springs in. */
const OFFSCREEN = 2400;

interface Viewport {
  height: number;
  safeBottom: number;
}

type SnapHeights = Record<SheetSnap, number>;

function snapHeights({ height, safeBottom }: Viewport, peekHeight: number): SnapHeights {
  const full = Math.max(height - TOP_GAP, peekHeight);
  const peek = Math.min(peekHeight + safeBottom, full);
  const half = Math.min(Math.max(Math.round(height * HALF_RATIO), peek), full);
  return { peek, half, full };
}

/** Snap the sheet should settle on after a drag ends at `offset` moving at `velocity` (px/ms, + = down). */
function snapAfterDrag(offset: number, velocity: number, heights: SnapHeights): SheetSnap {
  const visible = heights.full - offset;
  if (Math.abs(velocity) > FLICK_VELOCITY) {
    const ordered = velocity < 0 ? SNAPS : [...SNAPS].reverse();
    return ordered.find((s) => (velocity < 0 ? heights[s] > visible : heights[s] < visible)) ?? ordered[ordered.length - 1];
  }
  const projected = visible - velocity * 160;
  return SNAPS.reduce((best, s) => (Math.abs(heights[s] - projected) < Math.abs(heights[best] - projected) ? s : best));
}

function isInteractive(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest("input, textarea, select, a, button:not([data-sheet-grabber])") !== null;
}

/**
 * Bottom sheet on phones (three snap points, drag with velocity-aware
 * snapping), floating side panel from 768 px. Only the body scrolls.
 */
export function Sheet({ snap, onSnapChange, ariaLabel, header, children, peekHeight = 152, onInsetsChange }: SheetProps) {
  const m = useMessages(uiHu, uiEn);
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const reduceMotion = useReducedMotion() ?? false;
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const offset = useMotionValue(OFFSCREEN);
  const probeRef = useRef<HTMLDivElement>(null);
  const suppressClick = useRef(false);
  const stopDrag = useRef<(() => void) | null>(null);
  const insetsRef = useRef(onInsetsChange);
  useEffect(() => {
    insetsRef.current = onInsetsChange;
  }, [onInsetsChange]);

  useEffect(() => {
    const measure = () => {
      const safeBottom = probeRef.current ? parseFloat(getComputedStyle(probeRef.current).paddingBottom) || 0 : 0;
      setViewport({ height: window.innerHeight, safeBottom });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      stopDrag.current?.();
    };
  }, []);

  const heights = viewport ? snapHeights(viewport, peekHeight) : null;
  const heightsKey = heights ? `${heights.peek}/${heights.half}/${heights.full}` : "";

  const settle = useCallback(
    (target: SheetSnap, h: SnapHeights) => {
      const to = h.full - h[target];
      return animate(offset, to, reduceMotion ? { duration: 0 } : SPRING);
    },
    [offset, reduceMotion],
  );

  useEffect(() => {
    if (!heights || isDesktop) return;
    const controls = settle(snap, heights);
    return () => controls.stop();
    // heightsKey stands for `heights`, which is a new object on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap, heightsKey, isDesktop, settle]);

  useEffect(() => {
    if (!heights) return;
    insetsRef.current?.(isDesktop ? { left: PANEL_MARGIN + PANEL_WIDTH, bottom: 0 } : { left: 0, bottom: heights[snap] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap, heightsKey, isDesktop]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    // A drag ends in a click on the grabber; that click must not also cycle the snap.
    suppressClick.current = false;
    if (isDesktop || !heights || e.button !== 0 || isInteractive(e.target)) return;
    const startY = e.clientY;
    const startOffset = offset.get();
    const maxOffset = heights.full - heights.peek;
    let dragging = false;
    let last = { y: startY, t: e.timeStamp };
    let velocity = 0;

    const move = (ev: globalThis.PointerEvent) => {
      const dy = ev.clientY - startY;
      if (!dragging && Math.abs(dy) < DRAG_THRESHOLD) return;
      dragging = true;
      const dt = Math.max(ev.timeStamp - last.t, 1);
      velocity = 0.7 * ((ev.clientY - last.y) / dt) + 0.3 * velocity;
      last = { y: ev.clientY, t: ev.timeStamp };
      const raw = startOffset + dy;
      // Rubber-band past the ends instead of a hard stop.
      const clamped = raw < 0 ? raw / 4 : raw > maxOffset ? maxOffset + (raw - maxOffset) / 4 : raw;
      offset.set(clamped);
    };
    const end = () => {
      stopDrag.current?.();
      if (!dragging) return;
      suppressClick.current = true;
      const next = snapAfterDrag(offset.get(), velocity, heights);
      settle(next, heights);
      if (next !== snap) onSnapChange(next);
    };
    stopDrag.current = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      stopDrag.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== "Escape" || e.defaultPrevented || isDesktop || snap === "peek") return;
    e.preventDefault();
    onSnapChange(SNAPS[SNAPS.indexOf(snap) - 1]);
  };

  const cycle = () => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    onSnapChange(SNAPS[(SNAPS.indexOf(snap) + 1) % SNAPS.length]);
  };

  const hiddenBelow = heights && !isDesktop ? heights.full - heights[snap] : 0;

  return (
    <motion.section
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      style={{ y: offset, height: heights && !isDesktop ? heights.full : undefined }}
      className={
        "fixed inset-x-0 bottom-0 z-20 flex h-[calc(100dvh-56px)] flex-col rounded-t-sheet bg-surface shadow-sheet " +
        "md:inset-x-auto md:top-4 md:bottom-4 md:left-4 md:h-auto! md:w-[400px] md:transform-none! md:animate-fade md:rounded-sheet md:shadow-float"
      }
    >
      <div
        onPointerDown={onPointerDown}
        className="shrink-0 touch-none select-none px-4 pb-3 md:touch-auto md:select-auto md:pt-4"
      >
        <button
          type="button"
          data-sheet-grabber
          onClick={cycle}
          aria-label={`${m.sheetResize}: ${m.sheetSize[snap]}`}
          className="mx-auto flex h-7 w-16 cursor-grab items-center justify-center active:cursor-grabbing md:hidden"
        >
          <span className="h-1.5 w-10 rounded-full bg-line transition-colors duration-150 hover:bg-muted/50" />
        </button>
        {header}
      </div>
      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4"
        style={{ paddingBottom: `calc(${hiddenBelow + 24}px + env(safe-area-inset-bottom))` }}
      >
        {children}
      </div>
      <div ref={probeRef} aria-hidden="true" className="pointer-events-none invisible absolute pb-[env(safe-area-inset-bottom)]" />
    </motion.section>
  );
}
