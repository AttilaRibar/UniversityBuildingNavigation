"use client";

import { useMessages } from "@/presentation/i18n/I18nProvider";
import { pwaEn, pwaHu } from "@/presentation/i18n/messages/pwa";
import { useInstallPrompt } from "./useInstallPrompt";

/** The iOS Share glyph (square with an up arrow), drawn inline. */
function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" className="inline-block align-text-bottom">
      <path
        d="M12 15V3m0 0L8 7m4-4 4 4M7 10H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Compact, dismissible "install the app" card. Renders nothing when the app is
 * already installed, was dismissed, or cannot be installed from this browser.
 */
export function InstallBanner({ className }: { className?: string }) {
  const m = useMessages(pwaHu, pwaEn);
  const { canInstall, promptInstall, isIos, isStandalone, dismissed, dismiss } = useInstallPrompt();

  if (isStandalone || dismissed) return null;
  const showIosHint = isIos && !canInstall;
  if (!canInstall && !showIosHint) return null;

  return (
    <section
      aria-label={m.installTitle}
      className={`rounded-card border border-line bg-surface p-3 text-ink shadow-float ${className ?? ""}`}
    >
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- static export, tiny fixed icon */}
        <img src="/icons/icon-192.png" alt="" width={40} height={40} className="size-10 shrink-0 rounded-chip" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{m.installTitle}</p>
          {showIosHint ? (
            <ol className="mt-1 list-decimal pl-4 text-xs text-ink-soft">
              <li>
                {m.iosStep1} <ShareIcon />
              </li>
              <li>{m.iosStep2}</li>
            </ol>
          ) : (
            <p className="mt-0.5 text-xs text-ink-soft">{m.installBody}</p>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={m.dismiss}
          className="-mr-1 -mt-1 grid size-8 shrink-0 place-items-center rounded-chip text-muted active:bg-surface-2"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </svg>
        </button>
      </div>
      {canInstall && (
        <button
          type="button"
          onClick={() => void promptInstall()}
          className="mt-3 w-full rounded-chip bg-accent py-2 text-sm font-bold text-ink active:bg-accent-deep"
        >
          {m.install}
        </button>
      )}
    </section>
  );
}
