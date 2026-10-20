"use client";

// "On this page" (spec § Screens 4): the body's H2s and H3s as links, the one
// being read marked (`aria-current="location"` and the brand rule). The app
// shell scrolls <main id="main-content">, not the window, so the observers'
// root is that box: one watches the headings cross the reading line, one
// watches the foot of the page come into view (scrolled to the end, a short
// last section never reaches the line). A link scrolls its heading into view and hands it the
// focus, so the keyboard carries on reading from there. Beside the article it
// is a list; in one column it folds into a disclosure under the cover.

import * as React from "react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { currentHeading } from "@/lib/blog/article-view";
import type { Heading } from "@/lib/blog/doc";
import { cn } from "@/lib/utils";
import { motionReduced } from "@/lib/settings/appearance";

/** The reading line, as a share of the scrolling box from its top. */
const LINE = 0.3;

const scroller = () => document.getElementById("main-content");
const reduceMotion = () => motionReduced();

/** The anchor being read, following the scroll of <main>. `endRef` is the page's last element. */
export function useScrollSpy(anchors: readonly string[], endRef: React.RefObject<HTMLElement | null>): [string | null, (a: string) => void] {
  const [current, setCurrent] = React.useState<string | null>(anchors[0] ?? null);
  const key = anchors.join("\n");

  React.useEffect(() => {
    const root = scroller();
    const els = anchors.map((a) => document.getElementById(a)).filter((e): e is HTMLElement => !!e);
    if (!root || els.length === 0 || typeof IntersectionObserver === "undefined") return;
    let endInView = false;
    const pick = () => {
      const box = root.getBoundingClientRect();
      const tops = els.map((e) => e.getBoundingClientRect().top - box.top);
      const at = currentHeading(tops, box.height * LINE, box.height, endInView);
      setCurrent(at >= 0 ? els[at].id : null);
    };
    const lineWatch = new IntersectionObserver(pick, { root, rootMargin: `0px 0px -${Math.round((1 - LINE) * 100)}% 0px`, threshold: [0, 1] });
    els.forEach((e) => lineWatch.observe(e));
    const end = endRef.current;
    const endWatch = new IntersectionObserver(
      (entries) => {
        endInView = entries.some((e) => e.isIntersecting);
        pick();
      },
      { root },
    );
    if (end) endWatch.observe(end);
    pick();
    return () => {
      lineWatch.disconnect();
      endWatch.disconnect();
    };
    // `key` stands for `anchors`: a new array with the same anchors is the same list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, endRef]);

  return [current, setCurrent];
}

/** Brings a heading to the top of <main> (less its scroll margin). Only <main> moves:
 *  scrollIntoView would also shift the shell's own boxes once <main> runs out of room. */
export function scrollToHeading(el: HTMLElement, behavior: ScrollBehavior): void {
  const root = scroller();
  if (!root) return el.scrollIntoView({ behavior, block: "start" });
  const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
  root.scrollTo({ top: root.scrollTop + el.getBoundingClientRect().top - root.getBoundingClientRect().top - margin, behavior });
}

/** Scrolls to a heading in <main> and gives it the focus; the address keeps its anchor. */
export function goToHeading(anchor: string): boolean {
  const el = document.getElementById(anchor);
  if (!el) return false;
  scrollToHeading(el, reduceMotion() ? "auto" : "smooth");
  el.focus({ preventScroll: true });
  window.history.replaceState(window.history.state, "", `#${anchor}`);
  return true;
}

function Links({ headings, current, onGo, dense }: { headings: readonly Heading[]; current: string | null; onGo: (a: string) => void; dense?: boolean }) {
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {headings.map((h) => {
        const on = h.anchor === current;
        return (
          <li key={h.anchor}>
            <a
              href={`#${h.anchor}`}
              aria-current={on ? "location" : undefined}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                if (!goToHeading(h.anchor)) return;
                e.preventDefault();
                onGo(h.anchor);
              }}
              className={cn(
                "flex items-center rounded-sm border-0 border-l-2 border-solid py-3 pr-4 text-md leading-md no-underline outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
                h.level === 3 ? "pl-12" : "pl-6",
                dense ? "min-h-[var(--touch-min)]" : "max-md:min-h-[var(--touch-min)]",
                on
                  ? "border-border-brand font-semibold text-text-brand hover:text-text-brand-hover"
                  : "border-transparent text-text-secondary hover:text-text-primary",
              )}
            >
              {h.text}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/** Beside the article: the list under its label, the rule down its left edge. */
export function ContentsList({
  headings,
  current,
  onGo,
  label = "On this page",
  icon,
}: {
  headings: readonly Heading[];
  current: string | null;
  onGo: (a: string) => void;
  /** Tutorials name it "Page Content" (Figma 38577:5799), with its icon before the words. */
  label?: string;
  icon?: React.ReactNode;
}) {
  const id = React.useId();
  return (
    <nav aria-labelledby={id} className="flex flex-col gap-4">
      <h3 id={id} className="flex items-center gap-4 text-md font-semibold leading-md text-text-primary">
        {icon}
        {label}
      </h3>
      <div className="border-0 border-l border-solid border-border-subtle">
        <div className="-ml-px">
          <Links headings={headings} current={current} onGo={onGo} />
        </div>
      </div>
    </nav>
  );
}

/** In one column: "On this page (n)", folded until asked. */
export function ContentsDisclosure({
  headings,
  current,
  onGo,
  label = "On this page",
}: {
  headings: readonly Heading[];
  current: string | null;
  onGo: (a: string) => void;
  label?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const panel = React.useId();
  return (
    <nav aria-label={label} className="rounded-xl border border-solid border-border-subtle bg-bg-surface">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panel}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-[48px] w-full cursor-pointer items-center justify-between gap-4 rounded-xl px-8 text-left text-md font-semibold leading-md text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <span>
          {label} ({headings.length})
        </span>
        <span aria-hidden className={cn("inline-flex transition-transform duration-fast", open && "rotate-180")}>
          <Icon icon={ArrowDown01Icon} size={18} />
        </span>
      </button>
      <div id={panel} hidden={!open} className="px-6 pb-6">
        <Links headings={headings} current={current} onGo={onGo} dense />
      </div>
    </nav>
  );
}
