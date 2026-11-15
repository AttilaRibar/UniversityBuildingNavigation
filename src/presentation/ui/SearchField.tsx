"use client";

import { useRef } from "react";
import { useMessages } from "@/presentation/i18n/I18nProvider";
import { uiEn, uiHu } from "@/presentation/i18n/messages/ui";
import { Close, Search } from "./icons";

export interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  onFocus?: () => void;
  autoFocus?: boolean;
  className?: string;
}

/** Controlled search box with a leading icon and a clear button. */
export function SearchField({ value, onChange, placeholder, ariaLabel, onFocus, autoFocus, className }: SearchFieldProps) {
  const m = useMessages(uiHu, uiEn);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className={`relative ${className ?? ""}`}>
      <Search size={22} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
      <input
        ref={inputRef}
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        autoFocus={autoFocus}
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onFocus={onFocus}
        onChange={(e) => onChange(e.target.value)}
        // The focus ring below replaces the global outline, which would double it.
        style={{ outline: "none" }}
        className={
          "h-13 w-full rounded-card bg-surface-2 pr-12 pl-12 text-[17px] font-semibold text-ink ring-1 ring-transparent ring-inset " +
          "transition-[box-shadow,background-color] duration-150 placeholder:font-medium placeholder:text-muted " +
          "focus:bg-surface focus:ring-2 focus:ring-ink focus:outline-none " +
          "[&::-webkit-search-cancel-button]:appearance-none"
        }
      />
      {value !== "" ? (
        <button
          type="button"
          aria-label={m.clearSearch}
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          className="absolute top-1/2 right-1 grid size-11 -translate-y-1/2 place-items-center rounded-full text-muted animate-pop hover:text-ink"
        >
          <span className="grid size-7 place-items-center rounded-full bg-line/70">
            <Close size={16} />
          </span>
        </button>
      ) : null}
    </div>
  );
}
