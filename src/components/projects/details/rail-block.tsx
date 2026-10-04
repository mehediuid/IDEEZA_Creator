"use client";

// One rail block's frame, shared by every block in the project page's rail
// (COR-54, COR-56, COR-99, COM-22), so the blocks behave as one surface.
//
// Beside the page, a block is a section under its h2. Once the page container
// is narrower than RAIL_MIN the rail dissolves into the page under the tab
// panel, and each block becomes a disclosure — the WAI accordion pattern, a
// button inside the h2 — closed by default, its toggle naming the block's
// state after the title ("Outcome · Listed · Showcased"). A maker at 400 px
// scrolls past titles, not the whole record. The rail shell stacks the blocks
// on one surface with hairline dividers; a block draws no card of its own,
// and the shell adds no second toggle.
//
// Which layout is live comes from the page container's own container query,
// the one COR-5 switches the columns on: a 1 × 0 probe is 1 px wide beside
// the page and 2 px once stacked, and a ResizeObserver on it reads the switch
// before paint. Nothing is measured on each render, and the probe only
// resizes when the query flips, so no observer loop can start.

import * as React from "react";
import { flushSync } from "react-dom";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import type { MetaPart } from "@/lib/manual/project-summary";
import { cn } from "@/lib/utils";

/** Below this page-container width the rail stacks under the tab panel (COR-5, COR-56). */
export const RAIL_MIN = 1024;

const StackedContext = React.createContext(false);

/** True inside a block once the rail has dissolved into the page. */
export function useRailStacked(): boolean {
  return React.useContext(StackedContext);
}

/** The probe and what it reads. The probe's class carries RAIL_MIN − 1 as a literal,
 *  because Tailwind needs one; rail-blocks.test.mjs keeps the two in step. */
function useStackedProbe() {
  const probe = React.useRef<HTMLSpanElement>(null);
  const [stacked, setStacked] = React.useState(false);
  React.useLayoutEffect(() => {
    const el = probe.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const next = entry.contentRect.width > 1.5;
      // The first observation lands before the first paint; flushing it there
      // means a phone never shows one frame of the side-by-side rail.
      flushSync(() => setStacked(next));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { probe, stacked };
}

export function RailBlock({
  title,
  meta,
  collapsible = true,
  children,
}: {
  /** The block's h2: "Outcome", "Details", … */
  title: string;
  /** Said after the title on the stacked toggle — the block's state in a few words. */
  meta?: string;
  /** False keeps the block open once stacked, under a plain h2: Manage, whose
   *  Delete is the last thing on the page at 400 px (§3.3, COR-67). */
  collapsible?: boolean;
  children: React.ReactNode;
}) {
  const { probe, stacked } = useStackedProbe();
  const [open, setOpen] = React.useState(false);
  const headingId = React.useId();
  const panelId = React.useId();
  const folds = stacked && collapsible;
  return (
    <section
      aria-labelledby={headingId}
      className="relative flex flex-col gap-6 py-10 [@container(min-width:1024px)]:px-10"
    >
      <span
        ref={probe}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 h-0 w-px [@container(max-width:1023px)]:w-[2px]"
      />
      {folds ? (
        <h2 id={headingId} className="m-0">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((o) => !o)}
            className="flex min-h-[44px] w-full items-center gap-4 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <span className="shrink-0 text-lg font-bold text-text-primary">{title}</span>
            {meta && (
              <span className="min-w-0 truncate text-md font-medium text-text-secondary">· {meta}</span>
            )}
            <span
              aria-hidden
              className={cn(
                "ml-auto inline-flex shrink-0 text-text-tertiary transition-transform duration-normal ease-decelerate motion-reduce:transition-none",
                open && "rotate-180",
              )}
            >
              <Icon icon={ArrowDown01Icon} size={18} />
            </span>
          </button>
        </h2>
      ) : (
        <h2 id={headingId} className="m-0 text-lg font-bold text-text-primary">
          {title}
        </h2>
      )}
      <div id={panelId} className={cn("flex flex-col gap-6", folds && !open && "hidden")}>
        <StackedContext.Provider value={stacked}>{children}</StackedContext.Provider>
      </div>
    </section>
  );
}

/** A block's facts: label beside value in the rail, label over value once stacked (COM-22). */
export function RailFacts({ children }: { children: React.ReactNode }) {
  const stacked = useRailStacked();
  return (
    <dl
      className={
        stacked
          ? "m-0 flex flex-col gap-5"
          : "m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-8 gap-y-5"
      }
    >
      {children}
    </dl>
  );
}

/** One fact. An icon and tone are a second signal beside the word, never the only one (COM-6). */
export function RailFact({
  label,
  icon,
  tone = "neutral",
  children,
}: {
  label: string;
  icon?: IconValue;
  tone?: "neutral" | "success";
  children: React.ReactNode;
}) {
  const stacked = useRailStacked();
  return (
    <div className={stacked ? "flex flex-col gap-1" : "contents"}>
      <dt
        className={cn(
          "inline-flex items-start gap-2 self-baseline text-sm font-medium",
          tone === "success" ? "text-text-success" : "text-text-secondary",
        )}
      >
        {icon && (
          <span aria-hidden className="inline-flex pt-px">
            <Icon icon={icon} size={14} />
          </span>
        )}
        {label}
      </dt>
      <dd className="m-0 min-w-0 self-baseline break-words text-md font-medium text-text-primary">
        {children}
      </dd>
    </div>
  );
}

/** A line with the dates it names in `<time>` (COM-7), rendered the way A3's notes say. */
export function RailValue({ parts }: { parts: MetaPart[] }) {
  return (
    <>
      {parts.map((p, i) =>
        p.kind === "text" ? (
          <React.Fragment key={i}>{p.text}</React.Fragment>
        ) : (
          <time key={i} dateTime={p.time.dateTime} title={p.time.title}>
            {p.time.text}
          </time>
        ),
      )}
    </>
  );
}
