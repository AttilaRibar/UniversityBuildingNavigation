"use client";

import type { CSSProperties, Ref } from "react";
import { useMessages } from "@/presentation/i18n/I18nProvider";
import { uiEn, uiHu } from "@/presentation/i18n/messages/ui";

/**
 * Round compass button for rotatable maps. The owner rotates the needle
 * imperatively (`--bearing` on the element) so a slowly orbiting map does not
 * re-render React every frame, and toggles `data-rotated` to show it.
 */
export function Compass({
  ref,
  onReset,
  className,
  style,
}: {
  ref?: Ref<HTMLButtonElement>;
  onReset: () => void;
  className?: string;
  style?: CSSProperties;
}) {
  const m = useMessages(uiHu, uiEn);
  return (
    <button
      ref={ref}
      type="button"
      onClick={onReset}
      aria-label={m.resetRotation}
      title={m.resetRotation}
      data-rotated="false"
      style={style}
      className={
        "pointer-events-auto flex size-11 items-center justify-center rounded-full bg-surface shadow-float ring-1 ring-line " +
        "transition-[opacity,scale] duration-200 active:scale-95 data-[rotated=false]:pointer-events-none data-[rotated=false]:scale-75 data-[rotated=false]:opacity-0 " +
        (className ?? "")
      }
    >
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" style={{ rotate: "calc(var(--bearing, 0) * -1deg)" }}>
        <path d="M13 2.5 L17 13 H9 Z" fill="#d7263d" />
        <path d="M13 23.5 L9 13 H17 Z" fill="#14213d" />
        <circle cx="13" cy="13" r="2" fill="#ffffff" stroke="#14213d" strokeWidth="1.2" />
      </svg>
    </button>
  );
}

/** Updates a compass button for the map's bearing; it shows once the view is turned away from `rest`. */
export function syncCompass(button: HTMLButtonElement | null, bearing: number, rest: number): void {
  if (!button) return;
  button.style.setProperty("--bearing", bearing.toFixed(2));
  const off = Math.abs(((((bearing - rest) % 360) + 540) % 360) - 180);
  const rotated = off > 3 ? "true" : "false";
  if (button.dataset.rotated !== rotated) button.dataset.rotated = rotated;
}
