"use client";

// One step of a Tour Guide chapter (spec docs/superpowers/specs/2026-10-22-tour-guide-design.md).
// The page sits under the app's one dialog scrim (ModalFrame's overlay at 62 %; the Figma's 40 %
// vanished on the dark theme) with the step's controls cut out of it (Figma User Panel V2 ›
// Tour Guide), and the DS M10 Popover stands beside them: "n/N" and Skip Tour Guide, the title
// and body, then Previous and Next Tip (Explore on the last step). @floating-ui/dom keeps it there
// through scrolls and resizes. The cut-out is a hole in the scrim, so the control itself can still
// be used; the rest of the page can't be clicked until the tour moves on or ends.
//
// A step whose control isn't on screen waits a moment for it (a page still loading), then asks to
// be skipped. A control that goes away mid-step (the page changed, a dialog opened over it)
// pauses the chapter there.
//
// A tip (the chat's chapter) is the same popup with one way on, Got it, and Turn off tips in
// place of Skip Tour Guide: tips come one at a time as the chat fills, so there is no Previous.

import * as React from "react";
import { createPortal } from "react-dom";
import { arrow, autoUpdate, computePosition, flip, offset, shift, type Placement } from "@floating-ui/dom";
import { Button, Popover, linkVariants, type PopoverPlacement } from "@/components/ideeza";
import { scrollWithin } from "@/components/create/anchors";
import { cn } from "@/lib/utils";
import type { TourChapter, TourStep as Step } from "@/lib/tour/types";
import { findTargets, isPhone, isShown, unionBox, type Box } from "./targets";

/** How long a step waits for its control to appear before it is skipped: the first step of a run
 *  may be waiting on a page that is still loading, the others only on the page they are on. */
const WAIT_FIRST_MS = 6000;
const WAIT_MS = 1500;
/** Popover edge to the control: the arrow's 8 px and 2 px of air. */
const GAP = 10;

const ENTER = "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-normal motion-safe:ease-decelerate";
// Before it is placed: not seen and not pressable, yet still focusable, so the title can take
// focus the moment it lands (`visibility: hidden` would refuse it).
const HELD = "pointer-events-none opacity-0";
// A finger's reach on a phone or a touch screen, as ModalFrame's buttons have.
const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

// The scrim with one rectangle cut out: even-odd fill leaves the inner path empty, and an empty
// part of a clip-path takes no clicks either.
function cutOut(scrim: HTMLElement | null, b: Box) {
  if (!scrim) return;
  const l = Math.round(b.left);
  const t = Math.round(b.top);
  const r = Math.round(b.right);
  const btm = Math.round(b.bottom);
  scrim.style.clipPath = `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${l}px ${t}px, ${l}px ${btm}px, ${r}px ${btm}px, ${r}px ${t}px, ${l}px ${t}px)`;
}

export function TourStep({
  step,
  index,
  total,
  first,
  tips = false,
  nextPart,
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
  onPrev: () => void;
  onNext: () => void;
  /** Explore, on the last step. */
  onDone: () => void;
  /** Skip Tour Guide, or Escape. */
  onSkip: () => void;
  onNextPart: () => void;
  /** The popup is on screen. */
  onShown: () => void;
  /** The control never showed up. */
  onMissing: () => void;
  /** The control went away, or a dialog opened over the page. */
  onLost: () => void;
}) {
  // The host keys each step, so this runs once per step; it only ever renders in the browser.
  const [els, setEls] = React.useState<HTMLElement[] | null>(() => findTargets(step.target));
  const [placement, setPlacement] = React.useState<PopoverPlacement>("bottom");
  const [arrowAt, setArrowAt] = React.useState<number | null>(null);
  const [placed, setPlaced] = React.useState(false);
  const scrimRef = React.useRef<HTMLDivElement>(null);
  const floatingRef = React.useRef<HTMLDivElement>(null);
  const arrowRef = React.useRef<HTMLSpanElement>(null);
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const titleId = React.useId();
  const bodyId = React.useId();
  const last = index === total - 1;

  const missing = React.useEffectEvent(onMissing);
  const lost = React.useEffectEvent(onLost);
  const skip = React.useEffectEvent(onSkip);
  const shown = React.useEffectEvent(onShown);

  // Wait for a control that isn't there yet. The first look is after this commit: a step that
  // mounts with its page (a chapter started elsewhere) renders before that page's controls are in.
  React.useEffect(() => {
    if (els) return;
    const look = () => {
      const found = findTargets(step.target);
      if (!found) return;
      observer.disconnect();
      window.clearTimeout(timer);
      window.clearTimeout(now);
      setEls(found);
    };
    const observer = new MutationObserver(look);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style", "hidden"] });
    const now = window.setTimeout(look, 0);
    const timer = window.setTimeout(
      () => {
        observer.disconnect();
        missing();
      },
      first ? WAIT_FIRST_MS : WAIT_MS,
    );
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
      window.clearTimeout(now);
    };
  }, [els, step.target, first]);

  // Bring it into view, cut it out of the scrim, and keep the popover beside it.
  React.useEffect(() => {
    const floating = floatingRef.current;
    if (!els || !floating) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scrollWithin(els[0], "nearest", reduce ? "auto" : "smooth");
    const reference = {
      getBoundingClientRect: () => {
        const b = unionBox(els);
        return { x: b.left, y: b.top, ...b };
      },
      contextElement: els[0],
    };
    // Beside a control at the screen's left edge (the sidebar), under anything else.
    const start = unionBox(els);
    const side = !isPhone() && start.left + start.width / 2 < window.innerWidth * 0.3 ? "right" : "bottom";
    let alive = true;
    const update = () => {
      if (!els.every(isShown)) return lost();
      cutOut(scrimRef.current, unionBox(els));
      // Beside, then the other sides in turn; a tall control (a concept card) leaves room only to
      // one side. Where nothing fits, it slides along until it is on screen.
      const fallbackPlacements: Placement[] = side === "right" ? ["left", "bottom", "top"] : ["top", "left", "right"];
      const middleware = [offset(GAP), flip({ padding: 8, fallbackPlacements }), shift({ padding: 8, crossAxis: true })];
      if (arrowRef.current) middleware.push(arrow({ element: arrowRef.current, padding: 12 }));
      void computePosition(reference, floating, { strategy: "fixed", placement: side, middleware }).then(
        ({ x, y, placement: at, middlewareData }) => {
          if (!alive) return;
          // left/top, not a transform: the fade-in's keyframes write `transform` and would hold
          // the popup at the corner while they run.
          floating.style.left = `${Math.round(x)}px`;
          floating.style.top = `${Math.round(y)}px`;
          const s = at.split("-")[0] as PopoverPlacement;
          setPlacement(s);
          const a = middlewareData.arrow;
          setArrowAt((s === "top" || s === "bottom" ? a?.x : a?.y) ?? null);
          setPlaced(true);
        },
      );
    };
    const stop = autoUpdate(reference, floating, update);
    return () => {
      alive = false;
      stop();
    };
  }, [els]);

  // The step takes focus once it is on screen, so its title is read first.
  React.useEffect(() => {
    if (!placed) return;
    titleRef.current?.focus({ preventScroll: true });
    shown();
  }, [placed]);

  // Escape ends the tour from anywhere, and never reaches the page behind. A dialog opening over
  // the page (⌘K, the phone's menu) pauses it.
  React.useEffect(() => {
    if (!els) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      skip();
    };
    const observer = new MutationObserver(() => {
      if (document.querySelector('[aria-modal="true"]')) lost();
    });
    // Dialogs open in place too (the phone's menu drawer), not only as portals on <body>.
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("keydown", onKey, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("keydown", onKey, true);
    };
  }, [els]);

  // ← → move between steps. Keys typed here stop here: the editors listen on `window`, and Tab
  // goes on to whatever is next.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (tips) {
      // Nothing to move between.
    } else if (e.key === "ArrowRight" && !last) {
      e.preventDefault();
      onNext();
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      onPrev();
    }
    e.stopPropagation();
    if (e.key !== "Tab") e.nativeEvent.stopImmediatePropagation();
  };

  if (!els) return null;
  return createPortal(
    <>
      <div
        ref={scrimRef}
        aria-hidden
        data-tour-scrim
        className={cn(
          "fixed inset-0 z-popover bg-[color-mix(in_srgb,var(--color-bg-overlay)_62%,transparent)]",
          placed ? ENTER : HELD,
        )}
      />
      <div ref={floatingRef} className={cn("fixed left-0 top-0 z-popover", placed ? ENTER : HELD)}>
        <Popover
          role="dialog"
          aria-labelledby={titleId}
          aria-describedby={bodyId}
          data-tour-step
          placement={placement}
          arrowRef={arrowRef}
          arrowOffset={arrowAt}
          titleId={titleId}
          titleRef={titleRef}
          bodyId={bodyId}
          title={step.title}
          onKeyDown={onKeyDown}
          header={
            <div className="mb-3 flex items-center justify-between gap-6">
              <span className="text-sm font-medium leading-sm tabular-nums text-text-tertiary">
                <span aria-hidden>
                  {index + 1}/{total}
                </span>
                <span className="sr-only">
                  {tips ? "Tip" : "Step"} {index + 1} of {total}
                </span>
              </span>
              <button
                type="button"
                onClick={onSkip}
                className={linkVariants({ color: "brand", size: "md", className: "font-medium" })}
              >
                {tips ? "Turn off tips" : "Skip Tour Guide"}
              </button>
            </div>
          }
          actions={
            tips ? (
              <Button type="button" hierarchy="primary" size="md" className={TAP} onClick={last ? onDone : onNext}>
                {last ? "Done" : "Got it"}
              </Button>
            ) : (
              <>
                {index > 0 && (
                  <Button type="button" hierarchy="secondary" size="md" className={TAP} onClick={onPrev}>
                    Previous
                  </Button>
                )}
                <Button type="button" hierarchy="primary" size="md" className={TAP} onClick={last ? onDone : onNext}>
                  {last ? "Explore" : "Next Tip"}
                </Button>
              </>
            )
          }
        >
          <p>{step.body}</p>
          {last && nextPart && !tips && (
            <button
              type="button"
              onClick={onNextPart}
              className={linkVariants({ color: "brand", size: "md", className: "mt-3 font-medium" })}
            >
              Next part: {nextPart.name} →
            </button>
          )}
        </Popover>
      </div>
    </>,
    document.body,
  );
}
