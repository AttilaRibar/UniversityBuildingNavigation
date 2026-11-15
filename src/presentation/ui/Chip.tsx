import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-pressed"> & {
  /** Toggle state; when given, the chip is announced as a toggle button. */
  selected?: boolean;
  icon?: ReactNode;
};

/**
 * Small pill for quick filters. The visible pill is compact, but an invisible
 * hit area keeps the touch target at 44 px tall.
 */
export function Chip({ selected, icon, className, children, type = "button", ...rest }: ChipProps) {
  const look = selected ? "bg-ink text-white ring-ink" : "bg-surface text-ink ring-line hover:bg-surface-2";
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={
        "relative inline-flex h-9 shrink-0 select-none items-center gap-1.5 rounded-full px-3.5 text-sm font-bold " +
        "ring-1 ring-inset transition-[transform,background-color,color] duration-150 active:scale-95 " +
        "before:absolute before:inset-x-0 before:-inset-y-1 before:content-[''] " +
        `${look} ${className ?? ""}`
      }
      {...rest}
    >
      {icon ? <span className="-ml-1 inline-flex">{icon}</span> : null}
      {children}
    </button>
  );
}
