"use client";

// IDEEZA Design System — M10 Popover (Figma 1441:894; Placement Top 1441:734 · Right 1441:798 ·
// Bottom 1441:830 · Left 1441:862). An anchored bubble: a title (Body/SM Medium), the body
// (Body/SM), the _Modal actions row (803:48), and a 12×8 arrow on the side that faces the anchor.
// `placement` names the bubble's side of its anchor, so a Bottom popover points up.
//
// The bubble only: the caller places it (fixed, beside its anchor) and slides the arrow along its
// edge with `arrowOffset`. 280 wide, 8 inside, radius lg, the modal elevation.

import * as React from "react";
import { cn } from "@/lib/utils";

export type PopoverPlacement = "top" | "right" | "bottom" | "left";

// The arrow's box, path and resting edge per placement. Its open side overlaps the bubble's
// border by 1 px, so the stroke runs on into the bubble's without a seam.
const ARROW: Record<PopoverPlacement, { w: number; h: number; d: string; edge: string; axis: "left" | "top" }> = {
  bottom: { w: 12, h: 8, d: "M0 8 L6 0 L12 8", edge: "top-[-7px]", axis: "left" },
  top: { w: 12, h: 8, d: "M0 0 L6 8 L12 0", edge: "bottom-[-7px]", axis: "left" },
  right: { w: 8, h: 12, d: "M8 0 L0 6 L8 12", edge: "left-[-7px]", axis: "top" },
  left: { w: 8, h: 12, d: "M0 0 L8 6 L0 12", edge: "right-[-7px]", axis: "top" },
};

export interface PopoverProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  placement?: PopoverPlacement;
  title: React.ReactNode;
  titleId?: string;
  titleRef?: React.Ref<HTMLHeadingElement>;
  bodyId?: string;
  /** A row above the title, e.g. a step count and a way out. */
  header?: React.ReactNode;
  /** The _Modal actions row: secondary first, primary last. */
  actions?: React.ReactNode;
  /** Draws the arrow (default). Off for a popover that isn't beside anything. */
  arrow?: boolean;
  arrowRef?: React.Ref<HTMLSpanElement>;
  /** Where the arrow sits along its edge, in px from the bubble's start; centred when unset. */
  arrowOffset?: number | null;
}

/** M10's arrow alone, for a bubble composed around the same anchor (the Tour Guide's step card). */
export const PopoverArrow = React.forwardRef<HTMLSpanElement, { placement: PopoverPlacement; offset?: number | null }>(
  function PopoverArrow({ placement, offset }, ref) {
    const a = ARROW[placement];
    const along =
      offset == null ? { [a.axis]: `calc(50% - ${(a.axis === "left" ? a.w : a.h) / 2}px)` } : { [a.axis]: `${offset}px` };
    return (
      <span ref={ref} aria-hidden className={cn("pointer-events-none absolute block", a.edge)} style={along}>
        <svg width={a.w} height={a.h} viewBox={`0 0 ${a.w} ${a.h}`} className="block overflow-visible">
          <path d={a.d} className="fill-[var(--color-bg-surface)] stroke-[var(--color-border-default)]" strokeWidth={1} />
        </svg>
      </span>
    );
  },
);

export const Popover = React.forwardRef<HTMLDivElement, PopoverProps>(function Popover(
  {
    placement = "bottom",
    title,
    titleId,
    titleRef,
    bodyId,
    header,
    actions,
    arrow = true,
    arrowRef,
    arrowOffset,
    className,
    children,
    ...rest
  },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "relative w-[280px] max-w-[calc(100vw-16px)] rounded-lg border border-solid border-border bg-bg-surface p-4 shadow-3",
        className,
      )}
      {...rest}
    >
      <div className="flex flex-col gap-1">
        {header}
        <h2
          ref={titleRef}
          id={titleId}
          tabIndex={-1}
          className="text-md font-medium leading-md text-text-primary outline-none"
        >
          {title}
        </h2>
        {children != null && (
          <div id={bodyId} className="text-md font-regular leading-md text-text-secondary">
            {children}
          </div>
        )}
      </div>
      {actions && (
        <div className="mt-3 flex flex-wrap items-center justify-end gap-6 border-t border-solid border-border px-12 pb-12 pt-8">
          {actions}
        </div>
      )}
      {arrow && <PopoverArrow ref={arrowRef} placement={placement} offset={arrowOffset} />}
    </div>
  );
});
