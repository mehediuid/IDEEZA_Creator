// IDEEZA Design System — A17 Badge (Figma 46127:185982), the two variants the
// 3D panel draws: the blue filled chip (47167:30412) and the brand outline
// (47167:27539). B2 (My projects card + details header, spec §5.2) adds
// three more tones on the same tokens — "neutral" (the Draft status chip),
// "success" (every minted status chip) and "info" (the Showcase badge) — so
// src/components/projects/status-chip.tsx and its consumers don't hand-roll
// their own pill styling. "error" is A17 Subtle · Error · SM (Figma 494:273):
// color/badge/error-*, 11/16 on 2 × 6 — 5.91 : 1 light, 6.93 : 1 dark.
//
// Every tone is one Figma A17 variant: SM pads 2 × 6 (spacing/1, /3), MD 4 × 8
// (spacing/2, /4), gap 4 (spacing/2), Regular weight, normal tracking. "info"
// is Subtle · Blue · SM (A17 has no Info colour). The outline is a 1 px
// inside stroke, so it stays 24 tall like the filled MD badges.
import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeTone = "blue" | "brand" | "brand-outline" | "neutral" | "success" | "info" | "warning" | "error" | "brand-solid";

const TONE_CLASS: Record<BadgeTone, string> = {
  blue: "bg-badge-blue-bg px-3 py-1 text-xs leading-xs text-badge-blue-text",
  // M100 Comments' author-badge (an Innovations post's Maker): Figma color/badge/brand-*.
  brand: "bg-badge-brand-bg px-3 py-1 text-xs leading-xs text-badge-brand-text",
  "brand-outline": "px-4 py-2 text-sm leading-xs text-text-brand ring-[length:var(--border-width-1)] ring-inset ring-border-brand",
  neutral: "bg-bg-subtle px-3 py-1 text-xs leading-xs text-text-secondary",
  success: "bg-badge-success-bg px-3 py-1 text-xs leading-xs text-badge-success-text",
  info: "bg-badge-blue-bg px-3 py-1 text-xs leading-xs text-badge-blue-text",
  // Phase 2: the "Testnet demo" pill (TestnetDemoBadge). 6.62 : 1 light, 5.66 : 1 dark.
  warning: "bg-badge-warning-bg px-3 py-1 text-xs leading-xs text-badge-warning-text",
  error: "bg-badge-error-bg px-3 py-1 text-xs leading-xs text-badge-error-text",
  // DS A17 Style=Solid, Color=Brand (492:165): Caption/MD on the brand fill (7.9 : 1).
  "brand-solid": "bg-bg-brand px-4 py-2 text-sm leading-xs text-text-on-brand",
};

export function Badge({
  tone,
  icon,
  children,
  className,
}: {
  tone: BadgeTone;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 whitespace-nowrap rounded-full font-regular tracking-normal", TONE_CLASS[tone], className)}>
      {icon && <span aria-hidden className="inline-flex size-[12px] items-center justify-center">{icon}</span>}
      {children}
    </span>
  );
}
