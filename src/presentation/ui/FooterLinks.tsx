"use client";

import Link from "next/link";
import { REPOSITORY_URL } from "@/application/app-info";
import { useMessages } from "@/presentation/i18n/I18nProvider";
import { cityEn, cityHu } from "@/presentation/i18n/messages/city";
import { commonEn, commonHu } from "@/presentation/i18n/messages/common";

const LINK = "inline-flex min-h-11 items-center font-bold text-ink-soft underline decoration-line decoration-2 underline-offset-2 hover:decoration-accent";

/** Privacy and feedback links, shown at the bottom of every sheet. */
export function FooterLinks({ className }: { className?: string }) {
  const c = useMessages(commonHu, commonEn);
  const city = useMessages(cityHu, cityEn);
  return (
    <p className={`flex flex-wrap gap-x-5 text-xs ${className ?? ""}`}>
      <Link href="/privacy/" className={LINK}>
        {c.privacy}
      </Link>
      <a href={`${REPOSITORY_URL}/issues`} target="_blank" rel="noopener noreferrer" className={LINK}>
        {c.feedback}
        <span className="sr-only"> {city.opensInNewTab}</span>
      </a>
    </p>
  );
}
