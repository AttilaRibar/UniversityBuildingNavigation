"use client"; // Error boundaries must be Client Components.

import { useEffect } from "react";
import { trackException } from "@/application/analytics";
import { StatusView } from "@/presentation/pages/StatusView";

/** Catches render errors below the root layout; the language and the header still work. */
export default function ErrorBoundary({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    trackException(error, { boundary: "route" });
  }, [error]);
  return <StatusView kind="error" onRetry={retry} />;
}
