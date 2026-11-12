"use client";

// The phone's tour (Look around first on the Welcome map), as coach marks the
// way the web's Tour Guide points at a place (components/tour/tour-step.tsx):
// each stop opens its tab, dims the screen with the sheets' scrim and cuts a
// lit hole round that tab in the tab bar, ringed in the focus colour. A small
// card just above it — M10 Popover's bubble, its arrow pointing down at the
// tab — says what you do there, in a line or two. On top: the stop dots and
// Skip; at the foot: Back and Next (Done on the last), side by side and
// sized to the card. Tapping the lit tab is Next too. The hole and the card
// glide from tab to tab (300 ms, the standard curve) while the words change;
// under reduced motion they jump. Escape skips.
//
// It starts on the first tab screen after Look around first (this phone
// remembers it is owed, so a reload keeps it) and ends where the person was
// going. While it plays, the welcome offer waits, as on the web.

import * as React from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button } from "@/components/ideeza/button";
import { PopoverArrow } from "@/components/ideeza/popover";
import { updatePhone } from "@/lib/account/phone";
import { CONCEPT_COST } from "@/lib/create/credits";
import { cn } from "@/lib/utils";
import { TAB_ATTR } from "../tab-bar";
import { T } from "../type";

const STOPS: readonly { href: string; title: string; body: string }[] = [
  {
    href: "/m",
    title: "Home",
    body: "Clips of projects and products creators made and sell. Swipe up for the next one, tap one to see what you’d get.",
  },
  {
    href: "/m/earn",
    title: "Earn Coin",
    body: "Buy $IDZ Coin, stake IDZ, and earn coin when a friend you refer joins. Testnet demo: no real money moves.",
  },
  {
    href: "/m/ai",
    title: "AI",
    body: `Describe what you want to make in plain words, and AI draws the concept. A concept uses ${CONCEPT_COST} ${CONCEPT_COST === 1 ? "credit" : "credits"}.`,
  },
  {
    href: "/m/messages",
    title: "Message",
    body: "Your chats with other creators. Start one from Message on a creator’s profile, project or listing.",
  },
  {
    href: "/m/profile",
    title: "Profile",
    body: "Your projects, wallet, plan and settings. Projects save themselves as you work.",
  },
];

/** The hole's clearance round the tab. */
const PAD = 4;
/** The card's width and its distance from the screen's sides (16, as every screen's content). */
const CARD_W = 300;
const GUTTER = 16;
/** Hole edge to card: the ring, the arrow's 8 and a little air. */
const GAP = 12;
const GLIDE = "300ms var(--motion-easing-standard)";

type Hole = { x: number; y: number; w: number; h: number; r: number };

const still = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const n = (v: number) => Math.round(v * 10) / 10;

/** A rounded rectangle, always the same commands, so one hole can glide into the next. */
function roundRect({ x, y, w, h, r }: Hole): string {
  return (
    `M${n(x + r)} ${n(y)}H${n(x + w - r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + w)} ${n(y + r)}` +
    `V${n(y + h - r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + w - r)} ${n(y + h)}` +
    `H${n(x + r)}A${n(r)} ${n(r)} 0 0 1 ${n(x)} ${n(y + h - r)}` +
    `V${n(y + r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + r)} ${n(y)}Z`
  );
}

/** Sets a path, gliding there when asked and the browser can tween `d` (where it can't, it jumps). */
function setPath(el: SVGPathElement | null, d: string, glide: boolean) {
  if (!el) return;
  if (typeof CSS !== "undefined" && CSS.supports("d", 'path("M0 0")')) {
    el.style.transition = glide ? `d ${GLIDE}` : "none";
    el.style.setProperty("d", `path("${d}")`);
  } else {
    el.setAttribute("d", d);
  }
}

function tabOf(href: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[${TAB_ATTR}="${href}"]`);
}

export function PhoneTour() {
  const router = useRouter();
  const pathname = usePathname();
  // Where they were going when the tour began: it ends there.
  const [start] = React.useState(() => pathname + window.location.search);
  const [at, setAt] = React.useState(0);
  const [hole, setHole] = React.useState<Hole | null>(null);
  const [view, setView] = React.useState({ w: 0, h: 0 });
  const scrim = React.useRef<SVGPathElement>(null);
  const ring = React.useRef<SVGPathElement>(null);
  const title = React.useRef<HTMLHeadingElement>(null);
  const placed = React.useRef(false);
  const ids = React.useId();
  const stop = STOPS[at];
  const last = at === STOPS.length - 1;

  // The stop's tab opens behind the dimmed screen.
  React.useEffect(() => {
    if (pathname !== stop.href) router.replace(stop.href);
  }, [pathname, stop.href, router]);

  const end = React.useCallback(() => {
    updatePhone({ tourPending: false });
    if (window.location.pathname + window.location.search !== start) router.replace(start);
  }, [router, start]);
  const next = React.useCallback(() => (last ? end() : setAt((i) => i + 1)), [last, end]);

  // Where the stop's tab is, now and as the screen changes size; waits for the tab bar to be drawn.
  React.useEffect(() => {
    let frame = 0;
    let tries = 0;
    const measure = () => {
      const el = tabOf(stop.href);
      if (!el) {
        if (tries++ < 120) frame = requestAnimationFrame(measure);
        return;
      }
      const b = el.getBoundingClientRect();
      const w = b.width + 2 * PAD;
      const h = b.height + 2 * PAD;
      setView({ w: window.innerWidth, h: window.innerHeight });
      setHole({ x: b.left - PAD, y: b.top - PAD, w, h, r: Math.min(16, w / 2, h / 2) });
    };
    measure();
    const onResize = () => {
      tries = 0;
      measure();
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, [stop.href]);

  // The scrim with its hole, and the ring round it: the first time in place, then gliding.
  React.useLayoutEffect(() => {
    if (!hole) return;
    const glide = placed.current && !still();
    setPath(scrim.current, `M0 0H${view.w}V${view.h}H0Z${roundRect(hole)}`, glide);
    setPath(ring.current, roundRect(hole), glide);
    placed.current = true;
  }, [hole, view]);

  // Each stop's words are read out: the focus goes to its title.
  React.useEffect(() => {
    if (hole) title.current?.focus({ preventScroll: true });
  }, [at, hole]);

  // Tapping the lit tab is Next; Escape skips.
  React.useEffect(() => {
    const el = tabOf(stop.href);
    const onTap = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      next();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") end();
    };
    el?.addEventListener("click", onTap, true);
    window.addEventListener("keydown", onKey);
    return () => {
      el?.removeEventListener("click", onTap, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [stop.href, hole, next, end]);

  if (!hole) return null;

  const width = Math.min(CARD_W, view.w - 2 * GUTTER);
  const centre = hole.x + hole.w / 2;
  const left = Math.min(Math.max(centre - width / 2, GUTTER), view.w - GUTTER - width);
  const arrow = Math.min(Math.max(centre - left - 6, 16), width - 28);
  const glide = still() ? "none" : `transform ${GLIDE}`;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-sheet font-sans">
      <svg
        aria-hidden
        width={view.w}
        height={view.h}
        className="pointer-events-none absolute inset-0 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-normal"
      >
        {/* The hole lets a tap through to the tab; the rest of the screen waits. */}
        <path ref={scrim} fillRule="evenodd" className="pointer-events-auto fill-[var(--color-modal-scrim)]" />
        <path ref={ring} className="fill-none stroke-[var(--color-border-focus)] [stroke-width:2]" />
      </svg>
      <div
        role="dialog"
        aria-modal="false"
        aria-labelledby={`${ids}-title`}
        aria-describedby={`${ids}-body`}
        className="pointer-events-auto absolute left-0 rounded-lg border-[length:var(--border-width-1)] border-solid border-border bg-bg-surface p-8 shadow-modal motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-normal"
        style={{ width, bottom: view.h - hole.y + GAP, transform: `translateX(${left}px)`, transition: glide }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2" aria-hidden>
            {STOPS.map((s, i) => (
              <span
                key={s.href}
                className={cn(
                  "h-[6px] rounded-full transition-[width,background-color] duration-200",
                  i === at ? "w-[16px] bg-[var(--color-violet-500)]" : "w-[6px] bg-[var(--color-icon-disabled)]",
                )}
              />
            ))}
          </div>
          <span className="sr-only">
            Stop {at + 1} of {STOPS.length}
          </span>
          <button
            type="button"
            onClick={end}
            className={cn(
              T.meta,
              "-my-4 -mr-4 inline-flex min-h-[44px] items-center rounded-md px-4 font-medium outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus",
            )}
          >
            Skip
          </button>
        </div>
        <h2 ref={title} id={`${ids}-title`} tabIndex={-1} className={cn(T.rowTitle, "mt-4 outline-none")}>
          {stop.title}
        </h2>
        <p id={`${ids}-body`} className={cn(T.body, "mt-1")}>
          {stop.body}
        </p>
        <div className="mt-6 flex items-center justify-end gap-4">
          {at > 0 && (
            <Button hierarchy="ghost" size="lg" onClick={() => setAt(at - 1)}>
              Back
            </Button>
          )}
          <Button size="lg" onClick={next} iconTrailing={last ? undefined : <Icon icon={ArrowRight01Icon} size={18} />}>
            {last ? "Done" : "Next"}
          </Button>
        </div>
        <PopoverArrow placement="top" offset={arrow} />
      </div>
    </div>,
    document.body,
  );
}
