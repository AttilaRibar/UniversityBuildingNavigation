"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { LocalizedText } from "@/domain/indoor/model";

export type Locale = "hu" | "en";
export const LOCALES: readonly Locale[] = ["hu", "en"];
const STORAGE_KEY = "merre.locale";

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** Picks the right language from a bilingual data value. */
  text: (value: LocalizedText) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function readStoredLocale(): Locale | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "hu" || stored === "en" ? stored : null;
  } catch {
    return null;
  }
}

/**
 * Client-side language switch. Pages are prerendered in Hungarian; a stored
 * or browser preference for English is applied right after hydration.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("hu");

  useEffect(() => {
    const preferred = readStoredLocale() ?? (navigator.language.toLowerCase().startsWith("hu") ? "hu" : "en");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off sync with a browser-only preference
    setLocaleState(preferred);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode: the choice simply lasts for this visit.
    }
  }, []);

  const value = useMemo<I18nContextValue>(() => ({ locale, setLocale, text: (v) => v[locale] }), [locale, setLocale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

/** Selects the message set for the active language: `const m = useMessages(cityHu, cityEn)`. */
export function useMessages<T>(hu: T, en: T): T {
  return useI18n().locale === "hu" ? hu : en;
}
