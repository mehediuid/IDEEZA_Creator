"use client";

// The page tab strip (COR-19, COR-20, COR-21; P2-TABS-1, P2-TABS-2): the
// project page's "Project sections" and the product page's "Product sections".
// - It is an ARIA tablist with one Tab stop, the selected tab.
// - ←/→/Home/End go through the shared moveTab, across every group.
// - Groups are split by an `aria-hidden` hairline that is never a tab stop:
//   the product page's "what it is" (Media and the build's pieces) against
//   "who it's for" (Contributors, Customers). An empty group draws nothing.
// - The selected style is neutral: the subtle fill plus a text-primary
//   underline, which is ≥ 3:1 where the fill alone isn't. Never violet.
// - It is one row that scrolls and never wraps, and a tab it has to scroll to
//   is brought into view. The product page's eight tabs don't fit its column
//   at 1366 px with the sidebar open, so the strip says there is more: the
//   edge it can scroll past fades out, and a pointer gets a ‹ / › there that
//   scrolls it (as a scrolling tab bar does elsewhere). The chevrons are for
//   the mouse only — never Tab stops and hidden from assistive tech, since
//   the arrow keys already reach every tab — and absent on a touch screen,
//   where the strip is swiped.
// - The page owns the URL and the one tabpanel: tabs are id="tab-{id}" and
//   the panel is id="panel-{id}".

import * as React from "react";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { moveTab, revealDelta } from "@/lib/ui/tab-keys";
import { cn } from "@/lib/utils";

export type TabDef<T extends string> = { id: T; label: string };

const TAB =
  "inline-flex h-[36px] shrink-0 items-center whitespace-nowrap rounded-t-lg border-b-2 border-solid px-8 text-md font-semibold leading-md outline-none transition-colors duration-normal ease-out motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus [@media(pointer:coarse)]:h-[var(--touch-min)]";
const TAB_ON = "border-text-primary bg-bg-subtle text-text-primary";
const TAB_OFF = "border-transparent text-text-secondary hover:bg-bg-subtle hover:text-text-primary";

/** The fade over an edge the strip can scroll past (a mask, so it reads on any surface). */
const FADE = {
  start: "[mask-image:linear-gradient(to_left,black_calc(100%_-_var(--spacing-24)),transparent)]",
  end: "[mask-image:linear-gradient(to_right,black_calc(100%_-_var(--spacing-24)),transparent)]",
  both: "[mask-image:linear-gradient(to_right,transparent,black_var(--spacing-24),black_calc(100%_-_var(--spacing-24)),transparent)]",
} as const;

const CHEVRON =
  "absolute inset-y-0 z-10 hidden w-[var(--spacing-16)] items-center justify-center bg-bg-page text-text-secondary transition-colors duration-fast hover:text-text-primary [@media(hover:hover)_and_(pointer:fine)]:flex";

/** A revealed tab clears the chevron that sits over the edge (32 px) with room to spare. */
const REVEAL_PAD = 44;

type Edges = { start: boolean; end: boolean };

export function TabStrip<T extends string>({
  label,
  groups,
  active,
  onSelect,
}: {
  /** The tablist's accessible name: "Project sections", "Product sections". */
  label: string;
  /** The tabs in strip order, in groups; a hairline sits between two non-empty groups. */
  groups: readonly (readonly TabDef<T>[])[];
  active: T;
  onSelect: (id: T) => void;
}) {
  const stripRef = React.useRef<HTMLDivElement | null>(null);
  const shown = groups.filter((g) => g.length > 0);
  const ids = shown.flatMap((g) => g.map((t) => t.id));
  const idsKey = ids.join("|");
  const [edges, setEdges] = React.useState<Edges>({ start: false, end: false });

  // Which edges hide a tab: read on scroll and whenever the strip or a tab
  // changes size (the first observation lands before the first paint).
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
    for (const tab of strip.querySelectorAll<HTMLElement>("[data-tab]")) ro.observe(tab);
    return () => ro.disconnect();
  }, [measure, idsKey]);

  // COR-21: keep the selected tab in view when the strip is scrolled, on
  // arrival (a deep link to ?tab=network) and on every change. Only the strip
  // scrolls sideways; the page never moves.
  React.useEffect(() => {
    const strip = stripRef.current;
    const tab = strip?.querySelector<HTMLElement>(`[data-tab="${active}"]`);
    if (!strip || !tab) return;
    const delta = revealDelta(tab.getBoundingClientRect(), strip.getBoundingClientRect(), REVEAL_PAD);
    if (delta === 0) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    strip.scrollBy({ left: delta, behavior: still ? "auto" : "smooth" });
  }, [active]);

  const page = (dir: 1 | -1) => {
    const strip = stripRef.current;
    if (!strip) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    strip.scrollBy({ left: dir * Math.round(strip.clientWidth * 0.7), behavior: still ? "auto" : "smooth" });
  };

  const fade = edges.start && edges.end ? FADE.both : edges.start ? FADE.start : edges.end ? FADE.end : null;

  return (
    <div className="relative border-b border-solid border-border">
      {edges.start && (
        <button
          type="button"
          aria-hidden
          tabIndex={-1}
          // A click scrolls; it never takes the focus off the selected tab.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => page(-1)}
          className={cn(CHEVRON, "left-0")}
        >
          <Icon icon={ArrowLeft01Icon} size={16} />
        </button>
      )}
      <div
        ref={stripRef}
        role="tablist"
        aria-label={label}
        onKeyDown={(e) => moveTab(e, ids, active, onSelect)}
        onScroll={measure}
        className={cn("flex flex-nowrap items-end gap-2 overflow-x-auto overflow-y-hidden", fade)}
      >
        {shown.map((group, g) => (
          <React.Fragment key={g}>
            {g > 0 && (
              <span aria-hidden data-divider className="mx-4 mb-3 h-[20px] w-px shrink-0 self-end bg-border-strong" />
            )}
            {group.map(({ id, label: text }) => {
              const on = id === active;
              return (
                <button
                  key={id}
                  id={`tab-${id}`}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  aria-controls={on ? `panel-${id}` : undefined}
                  tabIndex={on ? 0 : -1}
                  data-tab={id}
                  onClick={() => onSelect(id)}
                  className={cn(TAB, on ? TAB_ON : TAB_OFF)}
                >
                  {text}
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      {edges.end && (
        <button
          type="button"
          aria-hidden
          tabIndex={-1}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => page(1)}
          className={cn(CHEVRON, "right-0")}
        >
          <Icon icon={ArrowRight01Icon} size={16} />
        </button>
      )}
    </div>
  );
}
