"use client";

// The first-product guide on screen (lib/tour/guide.ts; owner, 2026-10-25). A small card stays in
// the foot corner on every page while a new user makes their first product: "Your first product",
// how far along they are, what to do now, and Show me (on the page where it happens) or Take me
// there (anywhere else). It never dims the page or takes the focus, and sits under dialogs, so
// work goes on around it; it changes by itself when the user has done the step. – folds it into a
// pill that keeps the count; ✕ closes it (the Tour Guide panel brings it back).
//
// Show me rings the control the step is about, the way a tour step does but without the scrim, and
// follows it through scrolls and resizes until it is pressed, the step changes or it goes away. The
// card never covers that control: when it would (a Build button in the foot corner), it rises to sit
// just above it.

import * as React from "react";
import { createPortal } from "react-dom";
import { autoUpdate } from "@floating-ui/dom";
import { ArrowRight01Icon, Cancel01Icon, Compass01Icon, MinusSignIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, IconButton, ProgressBar, Spinner } from "@/components/ideeza";
import { cn } from "@/lib/utils";
import { findTargets, inkBox, isShown } from "./targets";

/** The ring's clearance round the control (a tour step's hole). */
const PAD = 6;
const ARRIVE =
  "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-slow motion-safe:ease-decelerate";
const FADE_IN = "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-normal motion-safe:ease-decelerate";
const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
/** The card's corner: clear of the editors' status bar along their foot; along the foot of a phone. */
const corner = (inEditor: boolean) =>
  cn(
    "fixed right-[16px] z-dropdown",
    "max-md:left-[8px] max-md:right-[8px] max-md:bottom-[max(8px,env(safe-area-inset-bottom))]",
    inEditor ? "bottom-[48px]" : "bottom-[16px]",
  );
const SURFACE = "w-[340px] rounded-lg border border-solid border-border bg-bg-surface p-8 shadow-3 max-md:w-auto";

export const GUIDE_TITLE = "Your first product";

/** Keeps the card off the step's control (`avoid`, a `data-tour` id): when the control sits where
 *  the card does, the card rises to just above it, and comes back down once it is clear. */
function useDodge(ref: React.RefObject<HTMLElement | null>, avoid: string | null, inEditor: boolean) {
  React.useLayoutEffect(() => {
    const card = ref.current;
    if (!card || !avoid) return;
    let el: HTMLElement | null = null;
    let stop = () => {};
    let timer = 0;
    const measure = () => {
      const base = inEditor ? 48 : 16;
      let rise = 0;
      if (el && isShown(el)) {
        const b = inkBox(el);
        const h = card.offsetHeight;
        // Where the card sits when it hasn't moved: the foot corner.
        const top = window.innerHeight - base - h;
        const left = window.innerWidth - 16 - card.offsetWidth;
        const under = b.right > left - PAD && b.left < window.innerWidth - 16 && b.bottom > top - PAD && b.top < window.innerHeight - base;
        const above = window.innerHeight - b.top + 2 * PAD;
        // No room above it (a control at the top of a short window): it stays.
        if (under && above + h <= window.innerHeight - PAD) rise = above - base;
      }
      card.style.transform = rise ? `translateY(-${rise}px)` : "";
    };
    // The control can come and go as the page draws (a build footer, a question): look again then.
    const attach = () => {
      const found = findTargets(avoid)?.[0] ?? null;
      if (found === el) return;
      stop();
      el = found;
      stop = el ? autoUpdate(el, card, measure) : () => {};
      measure();
    };
    attach();
    const observer = new MutationObserver(() => {
      if (!timer)
        timer = window.setTimeout(() => {
          timer = 0;
          attach();
        }, 200);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      stop();
      observer.disconnect();
      window.clearTimeout(timer);
      card.style.transform = "";
    };
  }, [ref, avoid, inEditor]);
}

/** Rising out of the way glides, unless motion is reduced. */
const GLIDE = "motion-safe:transition-transform motion-safe:duration-normal motion-safe:ease-standard";

export function GuideCard({
  index,
  total,
  title,
  body,
  waiting,
  action,
  avoid,
  inEditor,
  onAction,
  onFold,
  onClose,
}: {
  index: number;
  total: number;
  title: string;
  body: string;
  /** The app is working on this step: a spinner beside the way on (or in its place). */
  waiting: boolean;
  /** Show me, Take me there, or nothing while waiting on this page. */
  action: string | null;
  /** The step's control, which the card keeps clear of. */
  avoid: string | null;
  inEditor: boolean;
  onAction: () => void;
  onFold: () => void;
  onClose: () => void;
}) {
  const titleId = React.useId();
  const ref = React.useRef<HTMLElement>(null);
  useDodge(ref, avoid, inEditor);
  return createPortal(
    <section ref={ref} aria-labelledby={titleId} data-tour-guide className={cn(corner(inEditor), SURFACE, GLIDE, ARRIVE)}>
      <div className="flex items-center gap-4">
        <span aria-hidden className="inline-flex text-text-brand">
          <Icon icon={Compass01Icon} size={16} />
        </span>
        <h2 id={titleId} className="min-w-0 flex-1 truncate text-sm font-semibold leading-sm text-text-secondary">
          {GUIDE_TITLE}
        </h2>
        <span className="shrink-0 text-sm tabular-nums leading-sm text-text-tertiary">
          {index + 1} of {total}
        </span>
        <span className="-my-2 -mr-2 flex shrink-0 items-center">
          <IconButton size="sm" hierarchy="ghost" aria-label="Make the guide smaller" icon={<Icon icon={MinusSignIcon} />} onClick={onFold} />
          <IconButton size="sm" hierarchy="ghost" aria-label="Close the guide" icon={<Icon icon={Cancel01Icon} />} onClick={onClose} />
        </span>
      </div>
      <ProgressBar value={(index / total) * 100} label={`${index} of ${total} steps done`} className="mt-4" />
      {/* The words cross-fade as the step changes (the host's live region says them). */}
      <div key={`${title}-${waiting}`} className={cn("mt-6", FADE_IN)}>
        <p className="text-md font-semibold leading-md text-text-primary">{title}</p>
        <p className="mt-1 text-sm leading-sm text-text-secondary">{body}</p>
      </div>
      {(waiting || action) && (
        <div className="mt-6 flex items-center gap-4">
          {waiting && <Spinner size={16} />}
          {action && (
            <Button
              type="button"
              hierarchy={waiting ? "secondary" : "primary"}
              size="sm"
              className={cn("ml-auto", TAP)}
              onClick={onAction}
              iconTrailing={<Icon icon={ArrowRight01Icon} size={16} />}
            >
              {action}
            </Button>
          )}
        </div>
      )}
    </section>,
    document.body,
  );
}

/** The guide folded: the count and the step's name, a press away from the card. */
export function GuidePill({
  index,
  total,
  title,
  waiting,
  avoid,
  inEditor,
  onOpen,
}: {
  index: number;
  total: number;
  title: string;
  waiting: boolean;
  avoid: string | null;
  inEditor: boolean;
  onOpen: () => void;
}) {
  const ref = React.useRef<HTMLButtonElement>(null);
  useDodge(ref, avoid, inEditor);
  return createPortal(
    <button
      ref={ref}
      type="button"
      data-tour-guide
      aria-label={`${GUIDE_TITLE}, step ${index + 1} of ${total}: ${title}. Show the guide`}
      onClick={onOpen}
      className={cn(
        corner(inEditor),
        "inline-flex h-[40px] max-w-[280px] items-center gap-3 rounded-full border border-solid border-border bg-bg-surface px-6 shadow-3 outline-none max-md:left-auto",
        "transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus",
        GLIDE,
        TAP,
        ARRIVE,
      )}
    >
      {waiting ? (
        <Spinner size={16} />
      ) : (
        <span aria-hidden className="inline-flex text-text-brand">
          <Icon icon={Compass01Icon} size={16} />
        </span>
      )}
      <span className="shrink-0 text-sm font-semibold tabular-nums leading-sm text-text-primary">
        {index + 1} of {total}
      </span>
      <span className="min-w-0 truncate text-sm leading-sm text-text-secondary">{title}</span>
    </button>,
    document.body,
  );
}

/** The last card: the first product is done; the full tour shows the rest. */
export function GuideDone({ inEditor, onTour, onClose }: { inEditor: boolean; onTour: () => void; onClose: () => void }) {
  const titleId = React.useId();
  return createPortal(
    <section aria-labelledby={titleId} data-tour-guide className={cn(corner(inEditor), SURFACE, ARRIVE)}>
      <ProgressBar value={100} label="Every step done" />
      <div className="mt-6">
        <h2 id={titleId} className="text-md font-semibold leading-md text-text-primary">
          Your first product is done
        </h2>
        <p className="mt-1 text-sm leading-sm text-text-secondary">
          You made it, minted it and shared it. The full tour shows the rest of IDEEZA, page by page.
        </p>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-end gap-4">
        <Button type="button" hierarchy="ghost" size="sm" className={TAP} onClick={onClose}>
          Close
        </Button>
        <Button
          type="button"
          hierarchy="primary"
          size="sm"
          className={TAP}
          onClick={onTour}
          iconTrailing={<Icon icon={ArrowRight01Icon} size={16} />}
        >
          Full tour of IDEEZA
        </Button>
      </div>
    </section>,
    document.body,
  );
}

/** Show me: a ring round the step's control, following it, gone once it is pressed or goes away. */
export function GuideRing({ target, onGone }: { target: HTMLElement; onGone: () => void }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const gone = React.useEffectEvent(onGone);
  React.useLayoutEffect(() => {
    const ring = ref.current;
    if (!ring) return;
    const lg = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--radius-lg")) || 0;
    const place = () => {
      if (!isShown(target)) return gone();
      const b = inkBox(target);
      const own = parseFloat(getComputedStyle(target).borderTopLeftRadius) || 0;
      ring.style.left = `${b.left - PAD}px`;
      ring.style.top = `${b.top - PAD}px`;
      ring.style.width = `${b.width + 2 * PAD}px`;
      ring.style.height = `${b.height + 2 * PAD}px`;
      ring.style.borderRadius = `${Math.max(own + PAD, lg)}px`;
    };
    place();
    const stop = autoUpdate(target, ring, place);
    // Pressed (or anything else on the page pressed): the user has found it.
    const onPress = (e: PointerEvent) => {
      if (!(e.target as Element | null)?.closest?.("[data-tour-guide]")) gone();
    };
    document.addEventListener("pointerdown", onPress, true);
    return () => {
      stop();
      document.removeEventListener("pointerdown", onPress, true);
    };
  }, [target]);
  return createPortal(
    <div
      ref={ref}
      aria-hidden
      // Pulses a few times to catch the eye, then stays.
      className="pointer-events-none fixed z-dropdown border-2 border-solid border-border-focus motion-safe:animate-pulse motion-safe:[animation-iteration-count:3]"
    />,
    document.body,
  );
}
