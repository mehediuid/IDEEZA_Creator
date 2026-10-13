"use client";

// The status tabs of "Your articles" — All · Drafts · In review · Needs changes
// · Live, each with its count. They look and behave like the project page's
// tab strip (details/tab-strip.tsx, whose classes they use): one Tab stop, the
// arrows / Home / End move the selection and focus with it (lib/ui/tab-keys),
// one row that scrolls sideways and never wraps, a faded edge where it can
// scroll, and the selected tab brought into view. The count rides in a small
// pill and is read out with the label ("Drafts, 2 articles").

import * as React from "react";
import { moveTab, revealDelta } from "@/lib/ui/tab-keys";
import { articlesLabel } from "@/lib/blog/list";
import { STATUS_TABS, type StatusTab } from "@/lib/blog/status";
import { cn } from "@/lib/utils";
import { FADE, TAB, TAB_OFF, TAB_ON } from "@/components/projects/details/tab-strip";

export const BLOG_PANEL_ID = "blog-articles-panel";
export const blogTabId = (tab: StatusTab) => `blog-tab-${tab}`;

/** A selected tab clears the faded edge with room to spare. */
const REVEAL_PAD = 44;

export function BlogTabs({
  tab,
  counts,
  onChange,
  className,
}: {
  tab: StatusTab;
  /** null until the store has been read: the pills show "—". */
  counts: Record<StatusTab, number> | null;
  onChange: (tab: StatusTab) => void;
  className?: string;
}) {
  const stripRef = React.useRef<HTMLDivElement | null>(null);
  const [edges, setEdges] = React.useState({ start: false, end: false });
  const ids = STATUS_TABS.map((t) => t.id);

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

  // The selected tab in view, on arrival (a link to ?tab=live) and on every change.
  React.useEffect(() => {
    const strip = stripRef.current;
    const el = strip?.querySelector<HTMLElement>(`[data-tab="${tab}"]`);
    if (!strip || !el) return;
    const delta = revealDelta(el.getBoundingClientRect(), strip.getBoundingClientRect(), REVEAL_PAD);
    if (delta === 0) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    strip.scrollBy({ left: delta, behavior: still ? "auto" : "smooth" });
  }, [tab]);

  const fade = edges.start && edges.end ? FADE.both : edges.start ? FADE.start : edges.end ? FADE.end : null;

  return (
    <div
      ref={stripRef}
      role="tablist"
      aria-label="Articles by status"
      onKeyDown={(e) => moveTab(e, ids, tab, onChange)}
      onScroll={measure}
      className={cn("flex flex-nowrap items-end gap-2 overflow-x-auto overflow-y-hidden", fade, className)}
    >
      {STATUS_TABS.map((t) => {
        const on = t.id === tab;
        const n = counts ? counts[t.id] : null;
        return (
          <button
            key={t.id}
            id={blogTabId(t.id)}
            type="button"
            role="tab"
            aria-selected={on}
            aria-controls={BLOG_PANEL_ID}
            aria-label={`${t.label}, ${n === null ? "not counted yet" : articlesLabel(n)}`}
            tabIndex={on ? 0 : -1}
            data-tab={t.id}
            onClick={() => onChange(t.id)}
            className={cn(TAB, on ? TAB_ON : TAB_OFF, "group gap-3")}
          >
            {t.label}
            <span
              aria-hidden
              className={cn(
                "inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-full px-3 text-sm font-semibold leading-xs tabular-nums",
                on ? "bg-bg-surface text-text-primary" : "bg-bg-subtle text-text-secondary group-hover:bg-bg-surface",
              )}
            >
              {n ?? "—"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
