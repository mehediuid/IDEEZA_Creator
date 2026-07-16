"use client";

// IDEEZA Design System — A07 Search
// Search input with a leading magnifier icon and a clear action that appears
// once there's a value. Token-driven; theme-aware via IDEEZA tokens.

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  value?: string;
  onValueChange?: (value: string) => void;
  onClear?: () => void;
  containerClassName?: string;
}

const MagnifierIcon = () => (
  <span className="inline-flex shrink-0 text-[color:var(--color-text-tertiary)] transition-colors duration-150 group-focus-within:text-[color:var(--color-violet-600)]">
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
    </svg>
  </span>
);

const ClearIcon = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onValueChange, onClear, placeholder = "Search…", className, containerClassName, ...props }, ref) => {
    return (
      <div
        className={cn(
          "group flex items-center gap-[var(--spacing-4)] rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] px-[var(--spacing-6)] py-[var(--spacing-4)] transition-[background-color,border-color,box-shadow] duration-150 focus-within:border-[var(--color-border-brand)] focus-within:bg-[var(--color-bg-surface)] focus-within:shadow-[0_0_0_3px_var(--color-bg-brand-subtle)]",
          containerClassName,
        )}
      >
        <MagnifierIcon />
        <input
          ref={ref}
          value={value}
          onChange={(e) => onValueChange?.(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "min-w-0 flex-1 bg-transparent text-[length:var(--font-size-sm)] text-[color:var(--color-text-primary)] outline-none placeholder:text-[color:var(--color-text-tertiary)] font-[family-name:var(--font-family-body)]",
            className,
          )}
          {...props}
        />
        {value ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              onValueChange?.("");
              onClear?.();
            }}
            className="inline-flex shrink-0 items-center justify-center text-[color:var(--color-text-tertiary)] transition-colors hover:text-[color:var(--color-text-primary)]"
          >
            <ClearIcon />
          </button>
        ) : null}
      </div>
    );
  },
);
SearchInput.displayName = "SearchInput";
