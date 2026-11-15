import type { ReactNode } from "react";

/**
 * Inline SVG icons on a 24 px grid: 2 px strokes with round caps and joins in
 * `currentColor`, so they inherit text colour. Always decorative; the control
 * that holds an icon carries the accessible name.
 */
export interface IconProps {
  /** Rendered size in px. Default 24. */
  size?: number;
  className?: string;
}

function Icon({ size = 24, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const Search = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </Icon>
);

export const ArrowLeft = (p: IconProps) => (
  <Icon {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Icon>
);

export const ArrowRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
);

export const ArrowUp = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </Icon>
);

export const ArrowUpLeft = (p: IconProps) => (
  <Icon {...p}>
    <path d="M17 17 7 7M7 15V7h8" />
  </Icon>
);

export const ArrowUpRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 17 17 7M9 7h8v8" />
  </Icon>
);

export const TurnLeft = (p: IconProps) => (
  <Icon {...p}>
    <path d="M16 20v-7a4 4 0 0 0-4-4H5M9 5 5 9l4 4" />
  </Icon>
);

export const TurnRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 20v-7a4 4 0 0 1 4-4h7M15 5l4 4-4 4" />
  </Icon>
);

export const UTurn = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 20V9a4 4 0 0 1 8 0v8M12 13l4 4 4-4" />
  </Icon>
);

export const Close = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);

/** Navigation arrow in a circle: "start directions". */
export const Navigation = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="m12 6.5 4 10-4-2.2-4 2.2z" fill="currentColor" strokeWidth={1.5} />
  </Icon>
);

export const Building = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 21V5.5L13 3v18M13 8l7 2.5V21M3 21h18" />
    <path d="M7.5 8h2M7.5 12h2M7.5 16h2M16.5 13h.5M16.5 17h.5" />
  </Icon>
);

export const Layers = (p: IconProps) => (
  <Icon {...p}>
    <path d="m12 3 9 5-9 5-9-5z" />
    <path d="m3 12.5 9 5 9-5M3 16.5l9 5 9-5" />
  </Icon>
);

export const Stairs = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 20h5v-5h5v-5h5V5h3" />
  </Icon>
);

export const Elevator = (p: IconProps) => (
  <Icon {...p}>
    <rect x="4" y="3" width="16" height="18" rx="2.5" />
    <path d="m9 9.5 3-3 3 3M9 14.5l3 3 3-3" />
  </Icon>
);

export const Walk = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="13" cy="4.5" r="1.5" />
    <path d="m9 21 2.5-6 2.5 2.5V21M8 11.5l2.5-3.5 3.5 1.5 2 3h2.5M11.5 15l1-5" />
  </Icon>
);

export const Wheelchair = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="10" cy="4.5" r="1.5" />
    <path d="M10 8v6h6l2.5 5.5M10 11h5" />
    <path d="M7.5 11.2a5.5 5.5 0 1 0 7.2 7.3" />
  </Icon>
);

export const Restroom = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="7" cy="4.5" r="1.5" />
    <circle cx="17" cy="4.5" r="1.5" />
    <path d="M5 21v-6H4V9.5A1.5 1.5 0 0 1 5.5 8h3A1.5 1.5 0 0 1 10 9.5V15H9v6M12 3v18" />
    <path d="M15 21v-4h-1.5l1.5-7.5a1 1 0 0 1 1-.5h2a1 1 0 0 1 1 .5l1.5 7.5H19v4" />
  </Icon>
);

export const Coffee = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 9h12v5a6 6 0 0 1-6 6h0a6 6 0 0 1-6-6zM16 10.5h1.5a2.5 2.5 0 0 1 0 5H16" />
    <path d="M8 3.5c0 1.5 1 1.5 1 3M12 3.5c0 1.5 1 1.5 1 3" />
  </Icon>
);

export const Pin = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </Icon>
);

export const Flag = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 21V4M5 4.5c5-2.5 8 2.5 14 0v9c-6 2.5-9-2.5-14 0" />
  </Icon>
);

export const Share = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 15V3.5M7.5 8 12 3.5 16.5 8M8 11H6a1.5 1.5 0 0 0-1.5 1.5v7A1.5 1.5 0 0 0 6 21h12a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 18 11h-2" />
  </Icon>
);

export const ChevronRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="m9 5 7 7-7 7" />
  </Icon>
);

export const ChevronUp = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5 15 7-7 7 7" />
  </Icon>
);

export const ChevronDown = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5 9 7 7 7-7" />
  </Icon>
);

export const Globe = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
  </Icon>
);

export const Download = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.5V15M7 10.5l5 5 5-5M4.5 20.5h15" />
  </Icon>
);

export const Info = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5M12 7.5v.01" />
  </Icon>
);

export const Clock = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </Icon>
);
