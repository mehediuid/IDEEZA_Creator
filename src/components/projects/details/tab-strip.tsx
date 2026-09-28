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
//   is brought into view.
// - The page owns the URL and the one tabpanel: tabs are id="tab-{id}" and
//   the panel is id="panel-{id}".

import * as React from "react";
import { moveTab, revealDelta } from "@/lib/ui/tab-keys";
import { cn } from "@/lib/utils";

export type TabDef<T extends string> = { id: T; label: string };

const TAB =
  "inline-flex h-[36px] shrink-0 items-center whitespace-nowrap rounded-t-lg border-b-2 border-solid px-8 text-md font-semibold leading-md outline-none transition-colors duration-normal ease-out motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus [@media(pointer:coarse)]:h-[var(--touch-min)]";
const TAB_ON = "border-text-primary bg-bg-subtle text-text-primary";
const TAB_OFF = "border-transparent text-text-secondary hover:bg-bg-subtle hover:text-text-primary";

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

  // COR-21: keep the selected tab in view when the strip is scrolled at phone
  // width, on arrival (a deep link to ?tab=network) and on every change. Only
  // the strip scrolls sideways; the page never moves.
  React.useEffect(() => {
    const strip = stripRef.current;
    const tab = strip?.querySelector<HTMLElement>(`[data-tab="${active}"]`);
    if (!strip || !tab) return;
    const delta = revealDelta(tab.getBoundingClientRect(), strip.getBoundingClientRect(), 8);
    if (delta === 0) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    strip.scrollBy({ left: delta, behavior: still ? "auto" : "smooth" });
  }, [active]);

  return (
    <div
      ref={stripRef}
      role="tablist"
      aria-label={label}
      onKeyDown={(e) => moveTab(e, ids, active, onSelect)}
      className="flex flex-nowrap items-end gap-2 overflow-x-auto overflow-y-hidden border-b border-solid border-border"
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
  );
}
