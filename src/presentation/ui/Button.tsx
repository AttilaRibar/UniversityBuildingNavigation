import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "md" | "lg";

interface ButtonLookProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Leading icon, e.g. `<Navigation />`. */
  icon?: ReactNode;
}

const BASE =
  "inline-flex select-none items-center justify-center gap-2 rounded-card font-bold leading-none " +
  "transition-[transform,background-color,box-shadow] duration-150 ease-out active:scale-[0.97] " +
  "disabled:pointer-events-none disabled:opacity-50";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-ink shadow-[inset_0_-2px_0_rgb(0_0_0/0.12)] hover:bg-accent-deep",
  secondary: "bg-surface-2 text-ink ring-1 ring-inset ring-line hover:bg-line",
  ghost: "bg-transparent text-ink hover:bg-surface-2",
};

/** Both sizes keep at least a 44 px touch target. */
const SIZES: Record<ButtonSize, string> = {
  md: "min-h-11 px-4 text-base",
  lg: "min-h-14 px-5 text-lg",
};

function buttonClassName({ variant = "primary", size = "md" }: ButtonLookProps, extra?: string): string {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${extra ?? ""}`;
}

function Content({ icon, children }: { icon?: ReactNode; children?: ReactNode }) {
  return (
    <>
      {icon ? <span className="-ml-0.5 inline-flex shrink-0">{icon}</span> : null}
      {children}
    </>
  );
}

export type ButtonProps = ButtonLookProps & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ variant, size, icon, className, children, type = "button", ...rest }: ButtonProps) {
  return (
    <button type={type} className={buttonClassName({ variant, size }, className)} {...rest}>
      <Content icon={icon}>{children}</Content>
    </button>
  );
}

export type LinkButtonProps = ButtonLookProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    href: string;
    /** Opens in a new tab with a plain `<a>` (e.g. a maps app) instead of client-side navigation. */
    external?: boolean;
  };

/** A link that looks like a `Button`. */
export function LinkButton({ href, external, variant, size, icon, className, children, ...rest }: LinkButtonProps) {
  const cls = buttonClassName({ variant, size }, className);
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls} {...rest}>
        <Content icon={icon}>{children}</Content>
      </a>
    );
  }
  return (
    <Link href={href} className={cls} {...rest}>
      <Content icon={icon}>{children}</Content>
    </Link>
  );
}
