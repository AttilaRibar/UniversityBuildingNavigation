"use client";

import { LogoMark } from "@/presentation/brand/Logo";
import { useMessages } from "@/presentation/i18n/I18nProvider";
import { commonEn, commonHu } from "@/presentation/i18n/messages/common";
import { Button, LinkButton } from "@/presentation/ui/Button";
import { LanguageToggle } from "@/presentation/ui/LanguageToggle";

/** Full-screen message with a way back: the 404 page and the error boundary. */
export function StatusView({ kind, onRetry }: { kind: "not-found" | "error"; onRetry?: () => void }) {
  const c = useMessages(commonHu, commonEn);
  const title = kind === "not-found" ? c.notFoundTitle : c.errorTitle;
  const body = kind === "not-found" ? c.notFoundBody : c.errorBody;
  return (
    <main className="app-viewport flex flex-col items-center justify-center gap-4 overflow-y-auto px-6 text-center">
      <LanguageToggle className="absolute top-[max(12px,env(safe-area-inset-top))] right-3" />
      <LogoMark size={64} />
      <h1 className="text-2xl font-extrabold tracking-tight text-balance">{title}</h1>
      <p className="max-w-sm text-ink-soft">{body}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2.5">
        {onRetry ? <Button onClick={onRetry}>{c.retry}</Button> : null}
        <LinkButton href="/" variant={onRetry ? "secondary" : "primary"}>
          {c.home}
        </LinkButton>
      </div>
    </main>
  );
}
