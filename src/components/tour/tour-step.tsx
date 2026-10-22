"use client";

// The Tour Guide on screen (spec docs/superpowers/specs/2026-10-22-tour-guide-design.md). One
// layer stays up for a whole chapter, so moving from one step to the next is one continuous
// motion, not a popup closing and another one opening.
//
// The spotlight is the app's dialog scrim (ModalFrame's overlay at 62 %) with the step's controls
// cut out of it: a rounded hole 6 px clear of the control, following its corners, ringed in the
// focus colour the app already uses to point at a place (the arrival ring). The hole is part of
// the scrim's own path, so the control under it can still be used while the rest of the page
// waits.
//
// The card beside it keeps the Figma's layout (User Panel V2 › Tour Guide) in the design system:
// "n of N" and Skip Tour Guide, the title and body, then Previous and Next Tip (Explore on the
// last step), with M10's arrow pointing back at the control. @floating-ui/dom keeps it there
// through scrolls and resizes. On a phone it is a card along the foot of the screen.
//
// Motion: the scrim and card fade in once; between steps the hole and the card glide to the new
// place together (300 ms, the standard curve) while the words cross-fade; scrolling never
// animates; ending fades everything out. Under reduced motion every change is immediate.
//
// A step whose control isn't on screen waits a moment for it, then asks to be skipped. A control
// that goes away mid-step (the page changed, a dialog opened over it) pauses the chapter there. A
// tip (the chat's chapter) is the same card with one way on, Got it, and Turn off tips.

import * as React from "react";
import { createPortal } from "react-dom";
import { arrow, autoUpdate, computePosition, flip, offset, shift, type Placement } from "@floating-ui/dom";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, PopoverArrow, linkVariants, type PopoverPlacement } from "@/components/ideeza";
import { scrollWithin } from "@/components/create/anchors";
import { cn } from "@/lib/utils";
import type { TourChapter, TourStep as Step } from "@/lib/tour/types";
import { findTargets, isPhone, isShown, unionBox } from "./targets";

/** How long a step waits for its control to appear before it is skipped: the first step of a run
 *  may be waiting on a page that is still loading, the others only on the page they are on. */
const WAIT_FIRST_MS = 6000;
const WAIT_MS = 1500;
/** The hole's clearance round the control (spacing-3). */
const PAD = 6;
/** Hole edge to card: the ring's outer pixel, the arrow's 8 and 1 of air. */
const GAP = 10;
/** One step to the next: the slow duration on the standard curve, and a margin to land in. */
const GLIDE = "300ms var(--motion-easing-standard)";
const GLIDE_MS = 340;
const LEAVE = "opacity var(--motion-duration-fast) var(--motion-easing-accelerate)";

// A finger's reach on a phone or a touch screen, as ModalFrame's buttons have.
const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
const FADE_IN = "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-normal motion-safe:ease-decelerate";
// The card arrives from the control's side.
const ARRIVE: Record<PopoverPlacement, string> = {
  bottom: "motion-safe:slide-in-from-top-2",
  top: "motion-safe:slide-in-from-bottom-2",
  right: "motion-safe:slide-in-from-left-2",
  left: "motion-safe:slide-in-from-right-2",
};

const still = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "reduce";
const cssPath = () => typeof CSS !== "undefined" && CSS.supports("d", 'path("M0 0")');

type Hole = { x: number; y: number; w: number; h: number; r: number };

/** The hole round `els`: PAD clear of them, its corners following the control's own (one control)
 *  or the DS's lg radius (several, or a square control). */
function holeOf(els: HTMLElement[]): Hole {
  const b = unionBox(els);
  const w = b.width + 2 * PAD;
  const h = b.height + 2 * PAD;
  const own = els.length === 1 ? parseFloat(getComputedStyle(els[0]).borderTopLeftRadius) || 0 : 0;
  const lg = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--radius-lg")) || 0;
  return { x: b.left - PAD, y: b.top - PAD, w, h, r: Math.min(Math.max(own + PAD, lg), w / 2, h / 2) };
}

const n = (v: number) => Math.round(v * 10) / 10;

/** A rounded rectangle, always the same commands, so one hole can be tweened into the next. */
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
  if (cssPath()) {
    el.style.transition = glide ? `d ${GLIDE}` : "none";
    el.style.setProperty("d", `path("${d}")`);
  } else {
    el.setAttribute("d", d);
  }
}

type Shown = { index: number; step: Step; els: HTMLElement[] };

export function TourStep({
  step,
  index,
  total,
  first,
  tips = false,
  nextPart,
  leaving = false,
  onPrev,
  onNext,
  onDone,
  onSkip,
  onNextPart,
  onShown,
  onMissing,
  onLost,
}: {
  step: Step;
  index: number;
  total: number;
  /** Nothing of this run is on screen yet. */
  first: boolean;
  /** A tip of the chat's chapter: Got it and Turn off tips. */
  tips?: boolean;
  /** The chapter the last step offers next, if any. */
  nextPart: TourChapter | null;
  /** The tour is ending: everything fades out, and nothing answers any more. */
  leaving?: boolean;
  onPrev: () => void;
  onNext: () => void;
  /** Explore, on the last step. */
  onDone: () => void;
  /** Skip Tour Guide, or Escape. */
  onSkip: () => void;
  onNextPart: () => void;
  /** The step is on screen. */
  onShown: () => void;
  /** The control never showed up. */
  onMissing: () => void;
  /** The control went away, or a dialog opened over the page. */
  onLost: () => void;
}) {
  const [shown, setShown] = React.useState<Shown | null>(null);
  const [placed, setPlaced] = React.useState(false);
  const [placement, setPlacement] = React.useState<PopoverPlacement>("bottom");
  const [arrowAt, setArrowAt] = React.useState<number | null>(null);
  const [phone] = React.useState(isPhone);
  const shownRef = React.useRef<Shown | null>(null);
  const placedRef = React.useRef(false);
  const focusedFor = React.useRef<Shown | null>(null);
  const scrimRef = React.useRef<SVGPathElement>(null);
  const ringRef = React.useRef<SVGPathElement>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);
  const floatingRef = React.useRef<HTMLDivElement>(null);
  const arrowRef = React.useRef<HTMLSpanElement>(null);
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const titleId = React.useId();
  const bodyId = React.useId();

  const missing = React.useEffectEvent(() => !leaving && onMissing());
  const lost = React.useEffectEvent(() => !leaving && onLost());
  const skip = React.useEffectEvent(() => !leaving && onSkip());
  const announceShown = React.useEffectEvent(onShown);

  // Find this step's control, waiting a moment for one still on its way. The first look is after
  // this commit: a step that mounts with its page renders before that page's controls are in.
  React.useEffect(() => {
    if (leaving) return;
    const now = shownRef.current;
    if (now && now.index === index && now.step === step) return;
    let done = false;
    const look = () => {
      if (done) return;
      const found = findTargets(step.target);
      if (!found) return;
      done = true;
      stop();
      const next = { index, step, els: found };
      shownRef.current = next;
      setShown(next);
    };
    const observer = new MutationObserver(look);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style", "hidden"] });
    const soon = window.setTimeout(look, 0);
    const timer = window.setTimeout(
      () => {
        if (done) return;
        done = true;
        stop();
        missing();
      },
      first ? WAIT_FIRST_MS : WAIT_MS,
    );
    function stop() {
      observer.disconnect();
      window.clearTimeout(soon);
      window.clearTimeout(timer);
    }
    return stop;
  }, [index, step, first, leaving]);

  // Cut the shown step's controls out of the scrim and keep the card beside them; a new step
  // glides there from the last one.
  React.useEffect(() => {
    if (!shown) return;
    const floating = floatingRef.current;
    const { els } = shown;
    const calm = still();
    scrollWithin(els[0], "nearest", calm ? "auto" : "smooth");
    const glideUntil = placedRef.current && !calm ? performance.now() + GLIDE_MS : 0;
    const box = () => {
      const h = holeOf(els);
      return { x: h.x, y: h.y, width: h.w, height: h.h, top: h.y, left: h.x, right: h.x + h.w, bottom: h.y + h.h };
    };
    const reference = { getBoundingClientRect: box, contextElement: els[0] };
    // Beside a control at the screen's left edge (the sidebar), under anything else.
    const start = unionBox(els);
    const side: Placement = start.left + start.width / 2 < window.innerWidth * 0.3 ? "right" : "bottom";
    const fallbackPlacements: Placement[] = side === "right" ? ["left", "bottom", "top"] : ["top", "left", "right"];
    let alive = true;

    const land = () => {
      if (focusedFor.current === shown) return;
      focusedFor.current = shown;
      titleRef.current?.focus({ preventScroll: true });
      announceShown();
    };

    const update = () => {
      if (!els.every(isShown)) return lost();
      const moving = performance.now() < glideUntil;
      const hole = holeOf(els);
      setPath(scrimRef.current, `M0 0H${window.innerWidth}V${window.innerHeight}H0Z${roundRect(hole)}`, moving);
      setPath(ringRef.current, roundRect(hole), moving);
      if (phone || !floating) {
        if (!placedRef.current) {
          placedRef.current = true;
          setPlaced(true);
        }
        land();
        return;
      }
      const middleware = [offset(GAP), flip({ padding: 8, fallbackPlacements }), shift({ padding: 8, crossAxis: true })];
      if (arrowRef.current) middleware.push(arrow({ element: arrowRef.current, padding: 12 }));
      void computePosition(reference, floating, { strategy: "fixed", placement: side, middleware }).then(
        ({ x, y, placement: at, middlewareData }) => {
          if (!alive) return;
          floating.style.transition = performance.now() < glideUntil ? `transform ${GLIDE}` : "none";
          floating.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
          const s = at.split("-")[0] as PopoverPlacement;
          setPlacement(s);
          const a = middlewareData.arrow;
          setArrowAt((s === "top" || s === "bottom" ? a?.x : a?.y) ?? null);
          if (!placedRef.current) {
            placedRef.current = true;
            setPlaced(true);
          }
          land();
        },
      );
    };
    const stop = floating ? autoUpdate(reference, floating, update) : (update(), () => undefined);
    const onResize = () => update();
    window.addEventListener("resize", onResize);
    return () => {
      alive = false;
      stop();
      window.removeEventListener("resize", onResize);
    };
  }, [shown, phone]);

  // Escape ends the tour from anywhere and never reaches the page behind. A dialog opening over
  // the page (⌘K, the phone's menu) pauses it.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      skip();
    };
    // Dialogs open in place too (the phone's menu drawer), not only as portals on <body>.
    const observer = new MutationObserver(() => {
      if (document.querySelector('[aria-modal="true"]')) lost();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("keydown", onKey, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("keydown", onKey, true);
    };
  }, []);

  // Ending: everything fades out together (the host takes the layer away a moment later).
  React.useEffect(() => {
    if (!leaving) return;
    for (const el of [svgRef.current, floatingRef.current]) {
      if (!el) continue;
      el.style.transition = still() ? "none" : LEAVE;
      el.style.opacity = "0";
      el.style.pointerEvents = "none";
    }
  }, [leaving]);

  // ← → move between steps. Keys typed here stop here: the editors listen on `window`, and Tab
  // goes on to whatever is next.
  const content = shown ?? null;
  const at = content?.index ?? index;
  const last = at === total - 1;
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!tips && !leaving) {
      if (e.key === "ArrowRight" && !last) {
        e.preventDefault();
        onNext();
      } else if (e.key === "ArrowLeft" && at > 0) {
        e.preventDefault();
        onPrev();
      }
    }
    e.stopPropagation();
    if (e.key !== "Tab") e.nativeEvent.stopImmediatePropagation();
  };

  if (!content) return null;
  const counter = tips ? `Tip ${at + 1} of ${total}` : `${at + 1} of ${total}`;
  const primary = tips ? (last ? "Done" : "Got it") : last ? "Explore" : "Next Tip";

  return createPortal(
    <>
      <svg
        ref={svgRef}
        aria-hidden
        data-tour-scrim
        className={cn("pointer-events-none fixed inset-0 z-popover size-full", placed ? FADE_IN : "opacity-0")}
      >
        <path
          ref={scrimRef}
          fillRule="evenodd"
          className="pointer-events-auto fill-[color-mix(in_srgb,var(--color-bg-overlay)_62%,transparent)]"
        />
        <path ref={ringRef} className="fill-none stroke-[var(--color-border-focus)]" strokeWidth={2} />
      </svg>
      <div
        ref={floatingRef}
        className={cn(
          "fixed z-popover",
          phone
            ? "inset-x-[8px] bottom-[max(8px,env(safe-area-inset-bottom))]"
            : "left-0 top-0 w-[320px] max-w-[calc(100vw-16px)]",
          !placed && "pointer-events-none opacity-0",
        )}
      >
        <div
          role="dialog"
          aria-labelledby={titleId}
          aria-describedby={bodyId}
          data-tour-step
          onKeyDown={onKeyDown}
          className={cn(
            "relative rounded-lg border border-solid border-border bg-bg-surface p-8 shadow-3",
            placed && FADE_IN,
            placed && (phone ? "motion-safe:slide-in-from-bottom-4" : ARRIVE[placement]),
          )}
        >
          <div className="flex items-center justify-between gap-6">
            <span className="text-sm font-medium leading-sm tabular-nums text-text-tertiary">{counter}</span>
            <button
              type="button"
              onClick={onSkip}
              className={linkVariants({ color: "neutral", size: "md", className: "font-medium" })}
            >
              {tips ? "Turn off tips" : "Skip Tour Guide"}
            </button>
          </div>
          <div key={`${tips ? "tip" : "step"}-${at}`} className={cn("mt-4", FADE_IN)}>
            <h2 ref={titleRef} id={titleId} tabIndex={-1} className="text-lg font-semibold leading-lg text-text-primary outline-none">
              {content.step.title}
            </h2>
            <p id={bodyId} className="mt-2 text-md leading-md text-text-secondary">
              {content.step.body}
            </p>
            {last && nextPart && !tips && (
              <button
                type="button"
                onClick={onNextPart}
                className={linkVariants({ color: "brand", size: "md", className: "mt-4 font-semibold" })}
              >
                Next part: {nextPart.name}
                <Icon icon={ArrowRight01Icon} size={14} />
              </button>
            )}
          </div>
          <div className="mt-8 flex items-center justify-end gap-4">
            {!tips && at > 0 && (
              <Button type="button" hierarchy="ghost" size="md" className={TAP} onClick={onPrev}>
                Previous
              </Button>
            )}
            <Button
              type="button"
              hierarchy="primary"
              size="md"
              className={TAP}
              onClick={last ? onDone : onNext}
              iconTrailing={!tips && !last ? <Icon icon={ArrowRight01Icon} size={16} /> : undefined}
            >
              {primary}
            </Button>
          </div>
          {!phone && <PopoverArrow ref={arrowRef} placement={placement} offset={arrowAt} />}
        </div>
      </div>
    </>,
    document.body,
  );
}
