"use client";

// IDEEZA Design System — A18 Tag (Figma 517:645, usage 519:646).
//
// A pill chip in three sizes. Leading: nothing, a status dot, or any node in
// the 16 px leading slot (an icon, a small avatar, a lock). States: Default,
// Hover (only when it does something), Selected (a filter chip that is on:
// brand-subtle fill, brand edge and ink) and Disabled.
//
// What it is depends on what it does: with `onClick` it is a button — a
// toggle (`aria-pressed`) when `selected` is given, an action when not; with
// `onDismiss` it is a static chip with a trailing ✕ button; with neither it
// is plain text. A chip cannot be both pressable and dismissible, since a
// button cannot hold a button.

import * as React from "react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { cn } from "@/lib/utils";

export type TagSize = "sm" | "md" | "lg";

const SIZE: Record<TagSize, { box: string; dot: string; close: number }> = {
  // Caption/SM
  sm: { box: "gap-2 px-4 py-2 text-xs font-regular leading-xs tracking-normal", dot: "size-[6px]", close: 12 },
  // Caption/MD
  md: { box: "gap-3 px-5 py-3 text-sm font-regular leading-xs tracking-normal", dot: "size-[7px]", close: 16 },
  // Label/SM
  lg: { box: "gap-3 px-6 py-4 text-xs font-semibold leading-xs tracking-wider", dot: "size-[8px]", close: 16 },
};

type TagBase = {
  children: React.ReactNode;
  size?: TagSize;
  /** Leading node, drawn in a 16 px slot in the tag's own ink. */
  icon?: React.ReactNode;
  /** A leading status dot in the tag's ink (ignored when `icon` is set). */
  dot?: boolean;
  selected?: boolean;
  disabled?: boolean;
  className?: string;
};

export type TagProps = TagBase &
  (
    | { onClick?: undefined; onDismiss?: undefined }
    | { onClick: () => void; onDismiss?: undefined }
    | {
        onClick?: undefined;
        onDismiss: () => void;
        /** The ✕ button's name, e.g. "Remove Hardware". */
        dismissLabel: string;
      }
  );

export function Tag(props: TagProps) {
  const { children, size = "md", icon, dot, selected = false, disabled = false, className } = props;
  const s = SIZE[size];
  const interactive = !!props.onClick && !disabled;

  const box = cn(
    "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-solid transition-colors duration-fast motion-reduce:transition-none",
    s.box,
    selected
      ? "border-border-brand bg-bg-brand-subtle text-text-brand"
      : cn("border-border bg-bg-surface-raised text-text-primary", interactive && "hover:border-border-strong hover:bg-bg-subtle"),
    disabled && "opacity-[var(--opacity-disabled)]",
    interactive ? "cursor-pointer" : disabled && props.onClick ? "cursor-not-allowed" : undefined,
    className,
  );

  const content = (
    <>
      {icon ? (
        <span aria-hidden className="inline-flex size-[16px] shrink-0 items-center justify-center">
          {icon}
        </span>
      ) : dot ? (
        <span aria-hidden className={cn("shrink-0 rounded-full bg-current", s.dot)} />
      ) : null}
      {children}
    </>
  );

  if (props.onClick) {
    return (
      <button type="button" aria-pressed={props.selected} disabled={disabled} onClick={props.onClick} className={box}>
        {content}
      </button>
    );
  }

  return (
    <span className={box}>
      {content}
      {props.onDismiss ? (
        <button
          type="button"
          aria-label={props.dismissLabel}
          disabled={disabled}
          onClick={props.onDismiss}
          // On touch the ✕ keeps its glyph and gains a 44 px hit area around it (the chip doesn't grow).
          className="relative inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full disabled:cursor-not-allowed [@media(pointer:coarse)]:after:absolute [@media(pointer:coarse)]:after:left-1/2 [@media(pointer:coarse)]:after:top-1/2 [@media(pointer:coarse)]:after:size-[var(--touch-min)] [@media(pointer:coarse)]:after:-translate-x-1/2 [@media(pointer:coarse)]:after:-translate-y-1/2 [@media(pointer:coarse)]:after:content-['']"
        >
          <Icon icon={Cancel01Icon} size={s.close} />
        </button>
      ) : null}
    </span>
  );
}
