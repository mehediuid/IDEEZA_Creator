"use client";

// A Balance icon button with the Figma's tooltip (41571:126724 · 127189 ·
// 127654): the DS A19 bubble on hover AND on keyboard focus, so a keyboard
// user reads what the icon does. A control that isn't open yet stays
// focusable (aria-disabled, not disabled) so its tooltip can say so.

import * as React from "react";
import { useHoverTip } from "@/components/blog/list/hover-tip";
import { cn } from "@/lib/utils";

export function TipButton({
  label,
  soon,
  icon,
  onPress,
}: {
  /** The Figma tooltip, also the button's name. */
  label: string;
  /** Not open yet: the tooltip's second sentence. */
  soon?: string;
  icon: React.ReactNode;
  onPress?: () => void;
}) {
  const tipId = React.useId();
  const tip = soon ? `${label}. ${soon}` : label;
  const { setAnchor, show, hide, node } = useHoverTip(tip, "center", { id: tipId });
  return (
    <>
      <button
        ref={setAnchor}
        type="button"
        aria-label={label}
        aria-describedby={soon ? tipId : undefined}
        aria-disabled={soon ? true : undefined}
        onClick={soon ? undefined : onPress}
        onPointerEnter={show}
        onPointerLeave={() => hide()}
        onFocus={show}
        onBlur={() => hide(true)}
        className={cn(
          // Figma Button 32 × 32, violet-50 fill, radius 8; 44 on touch.
          "inline-flex size-[32px] shrink-0 items-center justify-center rounded-lg bg-bg-brand-subtle outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus max-md:size-[var(--touch-min)] [@media(pointer:coarse)]:size-[var(--touch-min)]",
          soon ? "cursor-not-allowed text-text-disabled" : "cursor-pointer text-text-brand hover:bg-bg-subtle",
        )}
      >
        {icon}
      </button>
      {node}
    </>
  );
}
