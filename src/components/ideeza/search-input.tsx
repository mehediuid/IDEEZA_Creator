"use client";

// IDEEZA Design System — A07 Search
// Search input with a leading magnifier icon and a clear action that appears
// once there's a value. Token-driven; theme-aware via IDEEZA tokens.
// Figma A07 (630:752) at size 36: the input fill and 1.5 px input border, the
// focus border plus the 3 px halo, 14/20 type, 16 px icons in icon/secondary
// while empty and icon/default once focused or filled, and Disabled as its own
// fill, edge, ink and icon colour.

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  value?: string;
  onValueChange?: (value: string) => void;
  onClear?: () => void;
  containerClassName?: string;
}

// icon/search-01 and icon/cancel-01, 1.5 px at 16 px.
const MagnifierIcon = () => (
  <svg aria-hidden width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="M17 17l4 4" />
  </svg>
);

const ClearIcon = () => (
  <svg aria-hidden width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onValueChange, onClear, placeholder = "Search…", disabled, className, containerClassName, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);
    return (
      <div
        // The whole box is the field: a press on its padding or the magnifier
        // focuses the input, so the target is the whole box, not the text row.
        onMouseDown={(e) => {
          if (e.target === inputRef.current || (e.target as HTMLElement).closest("button")) return;
          e.preventDefault();
          inputRef.current?.focus();
        }}
        className={cn(
          "group flex h-[36px] items-center gap-[var(--spacing-4)] rounded-[var(--radius-lg)] border-[length:var(--border-width-1-5)] border-solid px-[var(--spacing-5)] transition-[border-color,box-shadow] duration-150",
          disabled
            ? "cursor-not-allowed border-[var(--color-input-border-disabled)] bg-[var(--color-input-bg-disabled)]"
            : "border-[var(--color-input-border)] bg-[var(--color-input-bg)] focus-within:border-[var(--color-input-border-focus)] focus-within:shadow-focus-brand",
          containerClassName,
        )}
      >
        <span
          className={cn(
            "inline-flex shrink-0",
            disabled
              ? "text-[color:var(--color-icon-disabled)]"
              : value
                ? "text-[color:var(--color-icon-default)]"
                : "text-[color:var(--color-icon-secondary)] group-focus-within:text-[color:var(--color-icon-default)]",
          )}
        >
          <MagnifierIcon />
        </span>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onValueChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "min-w-0 flex-1 bg-transparent text-[length:var(--font-size-md)] leading-md text-[color:var(--color-input-text)] outline-none placeholder:text-[color:var(--color-input-placeholder)] font-[family-name:var(--font-family-body)] disabled:cursor-not-allowed disabled:text-[color:var(--color-text-disabled)]",
            className,
          )}
          {...props}
        />
        {value ? (
          <button
            type="button"
            aria-label="Clear search"
            disabled={disabled}
            onClick={() => {
              onValueChange?.("");
              onClear?.();
            }}
            // The glyph is 16 px. The ::before pad makes the target 24 px
            // without moving anything (WCAG 2.5.8), and the DS halo shows focus.
            className="relative inline-flex shrink-0 items-center justify-center rounded-full text-[color:var(--color-icon-default)] outline-none transition-colors before:absolute before:-inset-[var(--spacing-2)] before:content-[''] enabled:hover:text-[color:var(--color-text-primary)] focus-visible:shadow-focus-brand disabled:cursor-not-allowed disabled:text-[color:var(--color-icon-disabled)]"
          >
            <ClearIcon />
          </button>
        ) : null}
      </div>
    );
  },
);
SearchInput.displayName = "SearchInput";
