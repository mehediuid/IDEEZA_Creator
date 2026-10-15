// IDEEZA Design System — A17 Badge (Figma 46127:185982), the two variants the
// 3D panel draws: the blue filled chip (47167:30412) and the brand outline
// (47167:27539). B2 (My projects card + details header, spec §5.2) adds
// three more tones on the same tokens — "neutral" (the Draft status chip),
// "success" (every minted status chip) and "info" (the Showcase badge) — so
// src/components/projects/status-chip.tsx and its consumers don't hand-roll
// their own pill styling.
import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeTone = "blue" | "brand" | "brand-outline" | "neutral" | "success" | "info" | "warning" | "brand-solid";

const TONE_CLASS: Record<BadgeTone, string> = {
  blue: "bg-badge-blue-bg px-[6px] py-[2px] text-xs leading-xs text-badge-blue-text",
  // M100 Comments' author-badge (an Innovations post's Maker): Figma color/badge/brand-bg and
  // -text, which resolve to the brand-subtle fill and the brand ink.
  brand: "bg-bg-brand-subtle px-[6px] py-[2px] text-xs leading-xs text-text-brand",
  "brand-outline": "border border-solid border-border-brand px-[8px] py-[4px] text-sm leading-xs text-text-brand",
  neutral: "bg-bg-subtle px-[8px] py-[2px] text-xs leading-xs text-text-secondary",
  success: "bg-bg-success-subtle px-[8px] py-[2px] text-xs leading-xs text-text-success",
  info: "bg-badge-blue-bg px-[8px] py-[2px] text-xs leading-xs text-badge-blue-text",
  // Phase 2: the "Testnet demo" pill (TestnetDemoBadge). Existing tokens only; 4.76 : 1 light, 5.66 : 1 dark.
  warning: "bg-bg-warning-subtle px-[8px] py-[2px] text-xs leading-xs text-text-warning",
  // DS A17 Style=Solid, Color=Brand (492:165): Caption/MD on the brand fill (7.9 : 1). Solid
  // Success and Warning put white on green-500 / yellow-500 (under 3 : 1), so they stay subtle here.
  "brand-solid": "bg-bg-brand px-[8px] py-[4px] text-sm leading-xs text-text-on-brand",
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
    <span className={cn("inline-flex items-center gap-[4px] whitespace-nowrap rounded-full", TONE_CLASS[tone], className)}>
      {icon && <span aria-hidden className="inline-flex size-[12px] items-center justify-center">{icon}</span>}
      {children}
    </span>
  );
}
