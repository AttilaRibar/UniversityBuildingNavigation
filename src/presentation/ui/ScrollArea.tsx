"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import "./scrollArea.css";

export interface ScrollAreaProps {
  children: ReactNode;
  /** Classes for the outer box, which takes the place of the scrolling element in the layout. */
  className?: string;
  /** Classes and style for the scrolling viewport itself (padding goes here). */
  viewportClassName?: string;
  viewportStyle?: CSSProperties;
  /** Identifies what the area shows; when it changes, it scrolls back to the top. */
  resetKey?: string;
  /**
   * Pixels at the bottom of the viewport that are off-screen, as in a bottom
   * sheet that is not fully open. The bar keeps to the part that can be seen.
   */
  hiddenBottom?: number;
}

/** Shortest the thumb gets, so it stays easy to see and grab on long lists. */
const MIN_THUMB = 36;
/** How long the bar stays after the last scroll, in ms. */
const LINGER_MS = 900;
/** Height of the fade at an edge that has more content beyond it, in px. */
const FADE_PX = 20;

/**
 * A vertical scroller with a slim overlay bar instead of the platform scrollbar:
 * it shows while scrolling or hovering, can be dragged or clicked with a mouse,
 * and the edges fade where there is more to see. Touch, wheel and keyboard
 * scrolling stay native.
 */
export function ScrollArea({ children, className = "", viewportClassName = "", viewportStyle, resetKey, hiddenBottom = 0 }: ScrollAreaProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const viewportRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef(hiddenBottom);
  const geometry = useRef({ length: 0, travel: 0, range: 0 });
  const drag = useRef<{ startY: number; startTop: number; perPx: number } | null>(null);
  const lingerTimer = useRef(0);
  const syncRef = useRef<() => void>(() => {});

  useEffect(() => {
    const el = viewportRef.current;
    const root = rootRef.current;
    const track = trackRef.current;
    const thumb = thumbRef.current;
    const content = contentRef.current;
    if (!el || !root || !track || !thumb || !content) return;

    const sync = () => {
      const range = el.scrollHeight - el.clientHeight;
      const overflow = range > 1;
      root.toggleAttribute("data-overflow", overflow);
      const top = Math.min(Math.max(el.scrollTop, 0), Math.max(range, 0));
      el.style.setProperty("--scroll-fade-top", overflow && top > 1 ? `${FADE_PX}px` : "0px");
      el.style.setProperty("--scroll-fade-bottom", overflow && top < range - 1 ? `${FADE_PX}px` : "0px");
      if (!overflow) return;
      const available = track.clientHeight;
      const visible = Math.max(el.clientHeight - hiddenRef.current, 1);
      const length = Math.min(available, Math.max(MIN_THUMB, (available * visible) / (visible + range)));
      const travel = available - length;
      geometry.current = { length, travel, range };
      thumb.style.height = `${length}px`;
      thumb.style.transform = `translateY(${travel * (top / range)}px)`;
    };
    syncRef.current = sync;

    const onScroll = () => {
      sync();
      root.setAttribute("data-active", "");
      window.clearTimeout(lingerTimer.current);
      lingerTimer.current = window.setTimeout(() => root.removeAttribute("data-active"), LINGER_MS);
    };

    const observer = new ResizeObserver(sync);
    [el, content, track].forEach((node) => observer.observe(node));
    el.addEventListener("scroll", onScroll, { passive: true });
    sync();
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", onScroll);
      window.clearTimeout(lingerTimer.current);
    };
  }, []);

  useEffect(() => {
    if (viewportRef.current) viewportRef.current.scrollTop = 0;
  }, [resetKey]);

  useEffect(() => {
    hiddenRef.current = hiddenBottom;
    syncRef.current();
  }, [hiddenBottom]);

  const onTrackPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const el = viewportRef.current;
    const root = rootRef.current;
    if (!el || !root || e.button !== 0) return;
    e.preventDefault();
    const { length, travel, range } = geometry.current;
    if (thumbRef.current?.contains(e.target as Node)) {
      e.currentTarget.setPointerCapture(e.pointerId);
      drag.current = { startY: e.clientY, startTop: el.scrollTop, perPx: travel > 0 ? range / travel : 0 };
      root.setAttribute("data-dragging", "");
      return;
    }
    // A click on the empty track brings that spot of the list into view.
    const at = (e.clientY - e.currentTarget.getBoundingClientRect().top - length / 2) / Math.max(travel, 1);
    el.scrollTo({ top: Math.min(Math.max(at, 0), 1) * range, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const onTrackPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (d && viewportRef.current) viewportRef.current.scrollTop = d.startTop + (e.clientY - d.startY) * d.perPx;
  };

  const endDrag = () => {
    if (!drag.current) return;
    drag.current = null;
    rootRef.current?.removeAttribute("data-dragging");
  };

  return (
    <div ref={rootRef} className={`scroll-area relative flex min-h-0 flex-col ${className}`}>
      <div ref={viewportRef} className={`scroll-area__viewport min-h-0 flex-1 overflow-y-auto overscroll-contain ${viewportClassName}`} style={viewportStyle}>
        <div ref={contentRef}>{children}</div>
      </div>
      <div
        ref={trackRef}
        aria-hidden="true"
        className="scroll-area__track"
        style={{ bottom: `calc(${hiddenBottom + 14}px + env(safe-area-inset-bottom))` }}
        onPointerDown={onTrackPointerDown}
        onPointerMove={onTrackPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
      >
        <div ref={thumbRef} className="scroll-area__thumb" />
      </div>
    </div>
  );
}
