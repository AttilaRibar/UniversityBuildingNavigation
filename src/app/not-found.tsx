import type { Metadata } from "next";
import { StatusView } from "@/presentation/pages/StatusView";

export const metadata: Metadata = { title: "Nincs ilyen oldal", robots: { index: false } };

/** Exported as `404.html`; static hosts serve it for every unknown path. */
export default function NotFound() {
  return <StatusView kind="not-found" />;
}
