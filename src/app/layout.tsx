import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Óbuda Campus Navigator",
  description: "Find any room at Óbuda University.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="hu">
      <body>{children}</body>
    </html>
  );
}
