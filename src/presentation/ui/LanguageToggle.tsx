"use client";

import { LOCALES, useI18n, useMessages } from "@/presentation/i18n/I18nProvider";
import { commonEn, commonHu } from "@/presentation/i18n/messages/common";

const LANGUAGE_NAMES = { hu: "Magyar", en: "English" } as const;

/** Compact HU / EN segmented switch. */
export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale } = useI18n();
  const m = useMessages(commonHu, commonEn);
  return (
    <div
      role="group"
      aria-label={m.language}
      className={`flex h-11 shrink-0 items-center gap-0.5 rounded-full bg-surface p-1 shadow-float ring-1 ring-line ${className ?? ""}`}
    >
      {LOCALES.map((l) => {
        const active = l === locale;
        return (
          <button
            key={l}
            type="button"
            lang={l}
            aria-pressed={active}
            aria-label={LANGUAGE_NAMES[l]}
            onClick={() => setLocale(l)}
            className={
              "relative flex h-9 min-w-11 items-center justify-center rounded-full px-2.5 text-sm leading-none font-extrabold uppercase tracking-wide " +
              "transition-colors duration-200 active:scale-95 " +
              (active ? "bg-ink text-white" : "text-muted hover:text-ink")
            }
          >
            <span className="text-trim">{l}</span>
          </button>
        );
      })}
    </div>
  );
}
