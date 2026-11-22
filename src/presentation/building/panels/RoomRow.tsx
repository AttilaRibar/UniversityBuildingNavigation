import type { ReactNode } from "react";
import { ChevronRight } from "@/presentation/ui/icons";

/** One tappable row of a room or place list: big number, name underneath. */
export function RoomRow({
  title,
  subtitle,
  meta,
  onSelect,
  leading,
  wrapTitle,
}: {
  title: string;
  subtitle: string;
  meta?: string | null;
  onSelect: () => void;
  leading?: ReactNode;
  /** Long names (entrances) wrap instead of being cut off. */
  wrapTitle?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex min-h-14 w-full items-center gap-3 rounded-card px-2.5 py-2 text-left transition-colors duration-150 hover:bg-surface-2 active:bg-line"
    >
      {leading}
      <span className="min-w-0 flex-1">
        <span className={`block text-lg leading-tight font-extrabold ${wrapTitle ? "text-balance" : "truncate"}`}>{title}</span>
        <span className="block truncate text-sm text-muted">{subtitle}</span>
      </span>
      {meta ? <span className="shrink-0 text-sm font-semibold text-muted">{meta}</span> : null}
      <ChevronRight size={20} className="shrink-0 text-muted" />
    </button>
  );
}
