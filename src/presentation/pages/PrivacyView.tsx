"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { disableAnalytics } from "@/application/analytics";
import { REPOSITORY_URL } from "@/application/app-info";
import { browserSignalsNoTracking, readOptOut, writeOptOut } from "@/presentation/analytics/consent";
import { Logo } from "@/presentation/brand/Logo";
import { useMessages } from "@/presentation/i18n/I18nProvider";
import { privacyEn, privacyHu } from "@/presentation/i18n/messages/privacy";
import { ArrowLeft } from "@/presentation/ui/icons";
import { LanguageToggle } from "@/presentation/ui/LanguageToggle";

/** PostHog needs its key; Vercel Web Analytics needs a Vercel deployment. */
const ANALYTICS_CONFIGURED = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY) || Boolean(process.env.MERRE_DEPLOY_ENV);

type Consent = "unknown" | "on" | "off" | "reload" | "browser" | "none";

/** The privacy notice, with the analytics opt-out switch. */
export function PrivacyView() {
  const m = useMessages(privacyHu, privacyEn);
  const [consent, setConsent] = useState<Consent>("unknown");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only facts, read once after mount
    setConsent(!ANALYTICS_CONFIGURED ? "none" : browserSignalsNoTracking() ? "browser" : readOptOut() ? "off" : "on");
  }, []);

  const toggle = (on: boolean) => {
    writeOptOut(!on);
    if (on) setConsent("reload");
    else {
      disableAnalytics();
      setConsent("off");
    }
  };

  const switchable = consent === "on" || consent === "off" || consent === "reload";
  const checked = consent === "on" || consent === "reload";
  const state = { unknown: "", on: m.stateOn, off: m.stateOff, reload: m.stateReload, browser: m.stateBrowser, none: m.stateNone }[consent];
  const heading = "mt-8 mb-2 text-lg font-extrabold";

  return (
    <main className="min-h-dvh bg-canvas px-4 py-[max(16px,env(safe-area-inset-top))]">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
        <Link href="/" aria-label={m.back} className="flex h-11 items-center gap-2 rounded-full bg-surface pr-4 pl-2 shadow-float ring-1 ring-line">
          <ArrowLeft />
          <Logo />
        </Link>
        <LanguageToggle />
      </div>

      <article className="mx-auto mt-4 max-w-2xl rounded-sheet bg-surface p-6 leading-relaxed text-ink-soft shadow-float md:p-10">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">{m.title}</h1>
        <p className="mt-4 text-ink">{m.intro}</p>

        <h2 className={`${heading} text-ink`}>{m.collectedTitle}</h2>
        <ul className="list-disc space-y-1 pl-5">
          {m.collected.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <h2 className={`${heading} text-ink`}>{m.notCollectedTitle}</h2>
        <p>{m.notCollected}</p>

        <h2 className={`${heading} text-ink`}>{m.providerTitle}</h2>
        <p>{m.provider}</p>

        <h2 className={`${heading} text-ink`}>{m.choiceTitle}</h2>
        <p>{m.choice}</p>
        <label className={`mt-4 flex items-center justify-between gap-4 rounded-card bg-surface-2 p-4 ${switchable ? "cursor-pointer" : "opacity-70"}`}>
          <span className="min-w-0">
            <span className="block font-extrabold text-ink">{m.toggle}</span>
            <span className="block text-sm text-muted" aria-live="polite">
              {state}
            </span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={checked}
            disabled={!switchable}
            onChange={(e) => toggle(e.target.checked)}
            className="peer sr-only"
          />
          <span className="relative h-7 w-12 shrink-0 rounded-full bg-line transition-colors duration-200 peer-checked:bg-ink peer-focus-visible:outline-3 peer-focus-visible:outline-ink after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform after:duration-200 peer-checked:after:translate-x-5 peer-checked:after:bg-accent" />
        </label>

        <h2 className={`${heading} text-ink`}>{m.contactTitle}</h2>
        <p>
          {m.contact}{" "}
          <a href={`${REPOSITORY_URL}/issues`} target="_blank" rel="noopener noreferrer" className="font-bold break-all text-ink underline decoration-accent decoration-2 underline-offset-2">
            github.com/AttilaRibar/UniversityBuildingNavigation/issues
          </a>
        </p>
        <p className="mt-8 text-xs text-muted">{m.updated}</p>
      </article>
    </main>
  );
}
