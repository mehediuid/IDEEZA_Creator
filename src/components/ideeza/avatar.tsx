"use client";

// IDEEZA Design System — A16 Avatar (Figma 467:2) and A16b Avatar Label Group
// (Figma 469:30).
//
// Avatar — six sizes (20/24/32/40/48/64), each with its own initials type
// style. A person carries a colour (a DS token string such as
// `var(--color-orange-600)`), so the initials sit on that fill in on-brand
// ink; without one they take the design's brand-subtle fill and brand ink. An
// image `src` covers the initials, and a broken image falls back to them.
// Decorative by default (`aria-hidden`): beside a name the picture adds
// nothing to say. Given a `label` it is an image with that name.
//
// AvatarLabelGroup — the avatar beside a name and an optional supporting
// line, in the four sizes the design draws (SM–XL). The avatar in it is always
// decorative, since the name is right there.

import * as React from "react";
import { cn } from "@/lib/utils";

export type AvatarSize = "2xs" | "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_CLASS: Record<AvatarSize, string> = {
  "2xs": "size-[20px] text-2xs leading-2xs tracking-caps",
  xs: "size-[24px] text-xs leading-xs tracking-wider",
  sm: "size-[32px] text-md leading-md tracking-wide",
  md: "size-[40px] text-lg leading-lg tracking-normal",
  lg: "size-[48px] text-xl leading-xl tracking-normal",
  // Figma line/height/4xl (32px) is --line-height-3xl here — see tokens.css.
  xl: "size-[64px] text-3xl leading-3xl tracking-slight",
};

export interface AvatarProps {
  initials: string;
  /** The person's colour, a DS token string (`var(--color-…)`). */
  color?: string;
  src?: string;
  size?: AvatarSize;
  /** Names the avatar for assistive tech; without it the avatar is decorative. */
  label?: string;
  className?: string;
}

export function Avatar({ initials, color, src, size = "sm", label, className }: AvatarProps) {
  // Remembered per src, so a new picture gets its own chance to load.
  const [brokenSrc, setBrokenSrc] = React.useState<string | null>(null);
  const showImage = !!src && brokenSrc !== src;
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        "relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden whitespace-nowrap rounded-full font-semibold",
        SIZE_CLASS[size],
        color ? "text-text-on-brand" : "bg-bg-brand-subtle text-text-brand",
        className,
      )}
      // The fill is the person's own colour — data, not styling.
      style={color && !showImage ? { background: color } : undefined}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" onError={() => setBrokenSrc(src ?? null)} />
      ) : (
        initials
      )}
    </span>
  );
}

export type AvatarLabelGroupSize = "sm" | "md" | "lg" | "xl";

const GROUP_CLASS: Record<AvatarLabelGroupSize, { gap: string; name: string; supporting: string }> = {
  sm: {
    gap: "gap-4",
    name: "text-md font-medium leading-md tracking-normal",
    supporting: "text-sm leading-xs tracking-normal",
  },
  md: {
    gap: "gap-6",
    name: "text-lg font-medium leading-lg tracking-normal",
    supporting: "text-md leading-md tracking-normal",
  },
  lg: {
    gap: "gap-7",
    name: "text-md font-semibold leading-md tracking-wide",
    supporting: "text-lg leading-lg tracking-normal",
  },
  xl: {
    gap: "gap-8",
    name: "text-lg font-semibold leading-lg tracking-wide",
    supporting: "text-xl leading-2xl tracking-normal",
  },
};

export interface AvatarLabelGroupProps {
  name: React.ReactNode;
  supporting?: React.ReactNode;
  initials: string;
  color?: string;
  src?: string;
  size?: AvatarLabelGroupSize;
  className?: string;
}

export function AvatarLabelGroup({
  name,
  supporting,
  initials,
  color,
  src,
  size = "sm",
  className,
}: AvatarLabelGroupProps) {
  const s = GROUP_CLASS[size];
  return (
    <span className={cn("inline-flex min-w-0 items-center", s.gap, className)}>
      <Avatar initials={initials} color={color} src={src} size={size} />
      <span className="flex min-w-0 flex-col gap-1">
        <span className={cn("truncate text-text-primary", s.name)}>{name}</span>
        {supporting ? <span className={cn("truncate font-regular text-text-secondary", s.supporting)}>{supporting}</span> : null}
      </span>
    </span>
  );
}
