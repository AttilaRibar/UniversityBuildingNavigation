"use client"; // Error boundaries must be Client Components.

import { useEffect } from "react";
import { trackException } from "@/application/analytics";
import "./globals.css";

/**
 * Last line of defence: an error in the root layout itself. It replaces the whole
 * document, so there is no i18n provider here; the text is in both languages.
 */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    trackException(error, { boundary: "global" });
  }, [error]);
  return (
    <html lang="hu">
      <body>
        <title>Hiba · Merre</title>
        <main className="app-viewport flex flex-col items-center justify-center gap-3 px-6 text-center">
          <h1 className="text-2xl font-extrabold">Valami elromlott</h1>
          <p className="max-w-sm text-ink-soft" lang="en">
            Something went wrong.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2.5">
            <button type="button" onClick={() => retry()} className="min-h-11 rounded-card bg-accent px-4 font-bold text-ink">
              Újrapróbálás / Try again
            </button>
            {/* A full page load on purpose: the client router may be what broke. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" className="inline-flex min-h-11 items-center rounded-card bg-surface-2 px-4 font-bold text-ink ring-1 ring-line ring-inset">
              Főoldal / Home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
