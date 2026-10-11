"use client";

// The Earn sub-navigation, from EARN_GROUPS (earn-route.ts). Real links, one
// per section, so every section has its own address and Back walks them; the
// current one carries aria-current="page".
// - From a 1024 px page container it is a left column: each group under its
//   micro-label, the current row on the subtle fill with a text-primary bar
//   at its left edge (≥ 3:1 where the fill alone isn't). Never violet: the
//   section's own primary keeps the page's one violet.
// - Below that it is one row that scrolls sideways and never wraps, groups
//   split by an aria-hidden hairline, the current row underlined; the edge it
//   can scroll past fades, and the current row is brought into view. Only the
//   strip scrolls: the page never does.
// - Every row is 44 px, and 36 px beside the page on a fine pointer.

import * as React from "react";
import Link from "next/link";
import { EARN_GROUPS, EARN_SECTION_LABEL, earnHref, type EarnSection } from "@/lib/manual/earn-route";
import { revealDelta } from "@/lib/ui/tab-keys";
import { cn } from "@/lib/utils";

const ROW = cn(
  "flex min-h-[var(--touch-min)] shrink-0 items-center whitespace-nowrap rounded-t-lg border-b-2 border-solid px-6 text-md font-semibold leading-md outline-none transition-colors duration-normal ease-out motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus",
  "[@container(min-width:1024px)]:rounded-lg [@container(min-width:1024px)]:rounded-l-none [@container(min-width:1024px)]:border-b-0 [@container(min-width:1024px)]:border-l-2 [@container(min-width:1024px)]:px-4",
  "[@container(min-width:1024px)]:[@media(pointer:fine)]:min-h-[36px]",
);
const ROW_ON = "border-text-primary bg-bg-subtle text-text-primary";
const ROW_OFF = "border-transparent text-text-secondary hover:bg-bg-subtle hover:text-text-primary";

/** The fade over an edge the strip can scroll past (a mask, so it reads on any surface), as the tab strip's. */
const FADE = {
  start: "[mask-image:linear-gradient(to_left,black_calc(100%_-_var(--spacing-24)),transparent)]",
  end: "[mask-image:linear-gradient(to_right,black_calc(100%_-_var(--spacing-24)),transparent)]",
  both: "[mask-image:linear-gradient(to_right,transparent,black_var(--spacing-24),black_calc(100%_-_var(--spacing-24)),transparent)]",
} as const;

/** A revealed row clears the fade with room to spare. */
const REVEAL_PAD = 44;

export function EarnNav({ projectId, section }: { projectId: string; section: EarnSection }) {
  const stripRef = React.useRef<HTMLUListElement | null>(null);
  const base = React.useId();
  const [edges, setEdges] = React.useState({ start: false, end: false });

  // Which edges hide a row: read on scroll and whenever the strip changes size.
  // Beside the page nothing overflows, so neither edge fades.
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

  // The current row in view, on arrival and on every change.
  React.useEffect(() => {
    const strip = stripRef.current;
    const row = strip?.querySelector<HTMLElement>(`[data-section="${section}"]`);
    if (!strip || !row) return;
    const delta = revealDelta(row.getBoundingClientRect(), strip.getBoundingClientRect(), REVEAL_PAD);
    if (delta === 0) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    strip.scrollBy({ left: delta, behavior: still ? "auto" : "smooth" });
  }, [section]);

  const fade = edges.start && edges.end ? FADE.both : edges.start ? FADE.start : edges.end ? FADE.end : null;

  return (
    <nav
      aria-label="Earn sections"
      className="min-w-0 border-b border-solid border-border print:hidden [@container(min-width:1024px)]:sticky [@container(min-width:1024px)]:top-10 [@container(min-width:1024px)]:self-start [@container(min-width:1024px)]:border-b-0"
    >
      <ul
        ref={stripRef}
        onScroll={measure}
        className={cn(
          "m-0 flex list-none flex-nowrap items-end overflow-x-auto overflow-y-hidden p-0",
          "[@container(min-width:1024px)]:flex-col [@container(min-width:1024px)]:items-stretch [@container(min-width:1024px)]:gap-8 [@container(min-width:1024px)]:overflow-visible",
          fade,
        )}
      >
        {EARN_GROUPS.map((group, g) => {
          const labelId = `${base}-group-${g}`;
          return (
            <li key={g} className="flex shrink-0 items-end [@container(min-width:1024px)]:flex-col [@container(min-width:1024px)]:items-stretch [@container(min-width:1024px)]:gap-2">
              {g > 0 && (
                <span aria-hidden className="mx-4 mb-6 h-[20px] w-px shrink-0 bg-border-strong [@container(min-width:1024px)]:hidden" />
              )}
              {group.label && (
                <p id={labelId} className="m-0 hidden px-4 text-xs font-bold uppercase tracking-caps text-text-tertiary [@container(min-width:1024px)]:block">
                  {group.label}
                </p>
              )}
              <ul
                aria-labelledby={group.label ? labelId : undefined}
                className="m-0 flex list-none items-end gap-2 p-0 [@container(min-width:1024px)]:flex-col [@container(min-width:1024px)]:items-stretch [@container(min-width:1024px)]:gap-1"
              >
                {group.sections.map((s) => {
                  const on = s === section;
                  return (
                    <li key={s} className="flex">
                      <Link
                        href={earnHref(projectId, s)}
                        aria-current={on ? "page" : undefined}
                        data-section={s}
                        className={cn(ROW, "[@container(min-width:1024px)]:w-full", on ? ROW_ON : ROW_OFF)}
                      >
                        {EARN_SECTION_LABEL[s]}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
