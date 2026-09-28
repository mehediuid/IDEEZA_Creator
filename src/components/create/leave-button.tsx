"use client";

// LeaveButton — a control that takes the maker off the surface it sits on.
// It spins and says "Opening…" from the click, and every sibling is shut
// while one is under way: two navigations at once is not a thing the maker
// can have meant. It moved here from review-outputs.tsx so the review
// footer and the project page's header pair (COR-11) share one press state.

import * as React from "react";
import { Refresh01Icon } from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { cn } from "@/lib/utils";

export function LeaveButton({
  id,
  tone,
  busy,
  blocked,
  onClick,
  icon,
  className,
  "aria-label": ariaLabel,
  "aria-describedby": describedBy,
  children,
}: {
  id?: string;
  tone: "primary" | "quiet";
  busy: boolean;
  blocked: boolean;
  onClick: () => void;
  icon: IconValue;
  /** Layout only — width, and height at phone width. The paint is the tone's. */
  className?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  children: React.ReactNode;
}) {
  const base =
    "inline-flex h-[40px] shrink-0 items-center gap-4 whitespace-nowrap rounded-lg px-8 text-md font-semibold outline-none transition-colors duration-normal ease-decelerate focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none";
  // The focus colour on the brand fill measured 1.00:1 (COR-100), so the
  // primary's ring stands 2 px off it, in the surface colour.
  const paint =
    tone === "primary"
      ? "bg-bg-brand text-text-on-brand hover:bg-bg-brand-hover focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
      : "border border-solid border-border bg-bg-surface text-text-primary hover:bg-bg-surface-raised";
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      disabled={blocked}
      aria-busy={busy}
      aria-label={ariaLabel}
      aria-describedby={describedBy}
      className={cn(base, paint, blocked ? (busy ? "cursor-wait opacity-80" : "opacity-60") : "", className)}
    >
      <span aria-hidden className={busy ? "inline-flex motion-safe:animate-spin" : "inline-flex"}>
        <Icon icon={busy ? Refresh01Icon : icon} size={18} />
      </span>
      {busy ? "Opening…" : children}
    </button>
  );
}
