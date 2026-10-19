"use client";

// The Earn tabs, Overview · Sell · Business plan · Money (owner, 2026-10-11),
// under the header. Real links, one per tab, so every tab has its own address
// and Back walks them; the current one carries aria-current="page".
// - They look exactly like the project page's tab strip (tab-strip.tsx's
//   classes): the subtle fill and a text-primary underline on the current
//   tab, never violet, so the tab's own primary keeps the page's one violet.
// - One row that scrolls sideways and never wraps: the edge it can scroll past
//   fades, and the current tab is brought into view. Only the strip scrolls.
// - Every tab is 36 px on a fine pointer and 44 px at phone width or on a
//   coarse pointer (the strip's own rule).

import * as React from "react";
import Link from "next/link";
import { EARN_SECTION_LABEL, EARN_SECTIONS, earnHref, type EarnSection } from "@/lib/manual/earn-route";
import { revealDelta } from "@/lib/ui/tab-keys";
import { cn } from "@/lib/utils";
import { FADE, TAB, TAB_OFF, TAB_ON } from "../details/tab-strip";
import { motionReduced } from "@/lib/settings/appearance";

/** A revealed tab clears the fade with room to spare. */
const REVEAL_PAD = 44;

export function EarnNav({ projectId, section }: { projectId: string; section: EarnSection }) {
  const stripRef = React.useRef<HTMLUListElement | null>(null);
  const [edges, setEdges] = React.useState({ start: false, end: false });

  // Which edges hide a tab: read on scroll and whenever the strip changes size.
  const measure = React.useCallback(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const max = strip.scrollWidth - strip.clientWidth;
    const next = { start: strip.scrollLeft > 1, end: strip.scrollLeft < max - 1 };
    setEdges((prev) => (prev.start === next.start && prev.end === next.end ? prev : next));
  }, []);
  React.useLayoutEffect(() => {
    const strip = stripRef.current;
    if (!strip || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(strip);
    return () => ro.disconnect();
  }, [measure]);

  // The current tab in view, on arrival and on every change.
  React.useEffect(() => {
    const strip = stripRef.current;
    const tab = strip?.querySelector<HTMLElement>(`[data-section="${section}"]`);
    if (!strip || !tab) return;
    const delta = revealDelta(tab.getBoundingClientRect(), strip.getBoundingClientRect(), REVEAL_PAD);
    if (delta === 0) return;
    const still = motionReduced();
    strip.scrollBy({ left: delta, behavior: still ? "auto" : "smooth" });
  }, [section]);

  const fade = edges.start && edges.end ? FADE.both : edges.start ? FADE.start : edges.end ? FADE.end : null;

  return (
    <nav aria-label="Earn" className="min-w-0 border-b border-solid border-border print:hidden">
      <ul
        ref={stripRef}
        onScroll={measure}
        className={cn("m-0 flex list-none flex-nowrap items-end gap-2 overflow-x-auto overflow-y-hidden p-0", fade)}
      >
        {EARN_SECTIONS.map((s) => {
          const on = s === section;
          return (
            <li key={s} className="flex shrink-0">
              <Link
                href={earnHref(projectId, s)}
                aria-current={on ? "page" : undefined}
                data-section={s}
                className={cn(TAB, on ? TAB_ON : TAB_OFF)}
              >
                {EARN_SECTION_LABEL[s]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
