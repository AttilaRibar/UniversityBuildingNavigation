import { APP_NAME } from "@/application/app-info";

/** The app mark: a navy arrow on the accent yellow, echoing an airport wayfinding sign. */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={`block ${className ?? ""}`} aria-hidden="true">
      <rect x="2" y="2" width="60" height="60" rx="14" fill="#ffd21f" stroke="#14213d" strokeWidth="4" />
      <path d="M22 42 L40 24 M27 23 H41 V37" fill="none" stroke="#14213d" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-extrabold tracking-tight text-ink ${className ?? ""}`}>
      <LogoMark size={28} className="shrink-0" />
      <span className="text-trim text-xl leading-none">{APP_NAME}</span>
    </span>
  );
}
