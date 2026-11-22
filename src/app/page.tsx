import type { Metadata } from "next";
import { CityOverview } from "@/presentation/city/CityOverview";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function HomePage() {
  return <CityOverview />;
}
