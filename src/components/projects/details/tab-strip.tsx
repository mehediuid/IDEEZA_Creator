"use client";

// The Products · Media · Network strip (COR-19, COR-20, COR-21).
// - It is an ARIA tablist with one Tab stop, the selected tab.
// - ←/→/Home/End go through the shared moveTab.
// - The selected style is neutral: the subtle fill plus a text-primary
//   underline, which is ≥ 3:1 where the fill alone isn't. Never violet.
// - It is one row that scrolls and never wraps, and a tab it has to scroll to
//   is brought into view.
// - The shell owns the URL and the one tabpanel: tabs are id="tab-{id}" and
//   the panel is id="panel-{id}".

import * as React from "react";
import { PROJECT_TAB_LABEL, type ProjectTabId } from "@/lib/manual/project-route";
import { moveTab, revealDelta } from "@/lib/ui/tab-keys";
import { cn } from "@/lib/utils";

const TAB =
  "inline-flex h-[36px] shrink-0 items-center whitespace-nowrap rounded-t-lg border-b-2 border-solid px-8 text-md font-semibold leading-md outline-none transition-colors duration-normal ease-out motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus [@media(pointer:coarse)]:h-[var(--touch-min)]";
const TAB_ON = "border-text-primary bg-bg-subtle text-text-primary";
const TAB_OFF = "border-transparent text-text-secondary hover:bg-bg-subtle hover:text-text-primary";

export function TabStrip({
  tabs,
  active,
  onSelect,
}: {
  tabs: readonly ProjectTabId[];
  active: ProjectTabId;
  onSelect: (id: ProjectTabId) => void;
}) {
  const stripRef = React.useRef<HTMLDivElement | null>(null);

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
      aria-label="Project sections"
      onKeyDown={(e) => moveTab(e, tabs, active, onSelect)}
      className="flex flex-nowrap items-end gap-2 overflow-x-auto overflow-y-hidden border-b border-solid border-border"
    >
      {tabs.map((id) => {
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
            {PROJECT_TAB_LABEL[id]}
          </button>
        );
      })}
    </div>
  );
}
