"use client";

// The scroll edge under a header (the native top bar's look): no line while
// the content sits at the top, a border/default hairline once it scrolls under
// the header. It takes no room (0 px tall, the line drawn over the content's
// first pixel), so no screen moves. A header that already ends on a line (an
// M14 tab strip's baseline) gets no second one.
//
//   <ScrollEdge target={scrollRef} />   — right before the scrolling element

import * as React from "react";
import { cn } from "@/lib/utils";

/** The header's own last line: the nearest shown element before `el` (or its last child) has a bottom border. */
function headerHasLine(el: HTMLElement): boolean {
  let prev = el.previousElementSibling as HTMLElement | null;
  while (prev && prev.offsetHeight === 0) prev = prev.previousElementSibling as HTMLElement | null;
  if (!prev) return false;
  const lined = (node: Element | null) => !!node && parseFloat(getComputedStyle(node).borderBottomWidth) > 0;
  return lined(prev) || lined(prev.lastElementChild);
}

export function ScrollEdge({ target, className }: { target: React.RefObject<HTMLElement | null>; className?: string }) {
  const self = React.useRef<HTMLDivElement>(null);
  const [on, setOn] = React.useState(false);
  React.useEffect(() => {
    const el = target.current;
    const me = self.current;
    if (!el || !me) return;
    // Only when it crosses the top: the header is looked at then, not on every scroll frame.
    let scrolled: boolean | null = null;
    const read = () => {
      const now = el.scrollTop > 0;
      if (now === scrolled) return;
      scrolled = now;
      setOn(now && !headerHasLine(me));
    };
    read();
    el.addEventListener("scroll", read, { passive: true });
    return () => el.removeEventListener("scroll", read);
  }, [target]);
  return (
    <div ref={self} aria-hidden className={cn("relative z-sticky h-0 shrink-0", className)}>
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-[length:var(--border-width-1)] bg-border transition-opacity duration-fast",
          on ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}
