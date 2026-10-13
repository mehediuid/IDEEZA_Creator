// IDEEZA Design System — A21 Skeleton (Figma 566:835).
//
// The three primitive shapes the design draws, each in three sizes:
// `block` (Figma Rectangle, radius lg), `text` (Figma Line, radius sm) and
// `circle`. The sizes are the design's own; a caller sizes a bone to the
// content it stands in for with `className` (`w-full`, `h-[…]`), which wins
// over the default. The Figma's Avatar and Card skeletons are compositions of
// these three, so they are built at the call site.
//
// Always `aria-hidden` — the region that is loading says so (`aria-busy`), not
// each bone. It pulses while loading and holds still under
// prefers-reduced-motion (`motion-safe:`).

import { cn } from "@/lib/utils";

export type SkeletonShape = "block" | "text" | "circle";
export type SkeletonSize = "sm" | "md" | "lg";

const SHAPE: Record<SkeletonShape, { radius: string; size: Record<SkeletonSize, string> }> = {
  block: { radius: "rounded-lg", size: { sm: "h-[60px] w-[120px]", md: "h-[100px] w-[200px]", lg: "h-[160px] w-[320px]" } },
  text: { radius: "rounded-sm", size: { sm: "h-[8px] w-[80px]", md: "h-[12px] w-[160px]", lg: "h-[16px] w-[240px]" } },
  circle: { radius: "rounded-full", size: { sm: "h-[24px] w-[24px]", md: "h-[32px] w-[32px]", lg: "h-[48px] w-[48px]" } },
};

export interface SkeletonProps {
  shape?: SkeletonShape;
  size?: SkeletonSize;
  className?: string;
}

export function Skeleton({ shape = "block", size = "md", className }: SkeletonProps) {
  const s = SHAPE[shape];
  return (
    <span
      aria-hidden
      className={cn("block shrink-0 bg-bg-subtle motion-safe:animate-pulse", s.radius, s.size[size], className)}
    />
  );
}
