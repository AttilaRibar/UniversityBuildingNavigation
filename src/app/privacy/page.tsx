import type { Metadata } from "next";
import { PrivacyView } from "@/presentation/pages/PrivacyView";

export const metadata: Metadata = {
  title: "Adatvédelem",
  description: "Milyen névtelen használati adatot gyűjt a Merre, és hogyan kapcsolhatod ki.",
  alternates: { canonical: "/privacy/" },
};

export default function PrivacyPage() {
  return <PrivacyView />;
}
