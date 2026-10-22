"use client";

// The Tour Guide panel (spec D5): your journey so far, ticked by what was done (D7), then every
// chapter, under Start, Build and Earn & share, with Start, Replay or Resume where it stopped —
// or, when it can't start yet, why and the way there (D6). Below them,
// whether a page's tour is offered on a first visit, and Reset tours. From the sidebar's Support ›
// Tour Guide it floats beside the sidebar, the way the footer's account popover does; from ⌘K or
// the phone's menu it is a dialog (a bottom sheet on a phone).

import * as React from "react";
import { Cancel01Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { FloatingPanel } from "@/components/dashboard/sidebar-account";
import { Button, ModalFrame, Stepper, Toggle, linkVariants } from "@/components/ideeza";
import { TOUR_CHAPTERS, stepsFor } from "@/lib/tour/chapters";
import { JOURNEY, journeyNow, type JourneyStage } from "@/lib/tour/journey";
import { readinessOf } from "@/lib/tour/places";
import { chapterStatus } from "@/lib/tour/state";
import type { ChapterId, TourRecord } from "@/lib/tour/types";
import { isPhone, isShown } from "./targets";

// A finger's reach on a phone or a touch screen, as ModalFrame's buttons have.
const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

const OFFERS_LABEL = "Offer a tour the first time I open a page";

type PanelProps = {
  /** Support › Tour Guide in the sidebar, when that is what opened it. */
  anchor: HTMLElement | null;
  rec: TourRecord | null;
  /** What the chapters that run on your own work need. */
  ready: { hasProject: boolean; hasChat: boolean };
  /** Each stage of the journey, done or not. */
  journey: Record<JourneyStage, boolean>;
  /** Home is open: a locked chapter's "Go to Home" would go nowhere. */
  atHome: boolean;
  onStart: (id: ChapterId, step: number) => void;
  onGoHome: () => void;
  onOffers: (on: boolean) => void;
  onReset: () => void;
  onClose: () => void;
};

export function TourGuidePanel(props: PanelProps) {
  const { anchor } = props;
  // Decided once, on open: beside the link if it is on screen, a dialog otherwise.
  const [beside] = React.useState(() => !!anchor && isShown(anchor) && !isPhone());
  return beside && anchor ? <BesideSidebar {...props} anchor={anchor} /> : <AsDialog {...props} />;
}

function AsDialog(props: PanelProps) {
  return (
    <ModalFrame open onClose={props.onClose} size="sm" sheet title="Tour Guide" description="Your path from idea to product">
      <ChapterList {...props} />
    </ModalFrame>
  );
}

function BesideSidebar(props: PanelProps & { anchor: HTMLElement }) {
  const { anchor, onClose } = props;
  const anchorRef = React.useRef<HTMLElement | null>(anchor);
  const frameRef = React.useRef<HTMLElement | null>(anchor.closest("aside"));
  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const close = React.useEffectEvent(onClose);

  // A press outside closes it, as the footer's popovers do; the link that opened it toggles.
  React.useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || anchor.contains(t)) return;
      close();
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [anchor]);

  return (
    <FloatingPanel
      anchorRef={anchorRef}
      frameRef={frameRef}
      side="right"
      width={340}
      tone="surface"
      panelRef={panelRef}
      initialFocus="panel"
      role="dialog"
      aria-labelledby={titleId}
      onKeyDown={(e) => {
        if (e.key !== "Escape") return;
        e.stopPropagation();
        onClose();
      }}
    >
      <div className="flex items-start gap-4 px-8 pb-2 pt-8">
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-lg font-bold text-text-primary">
            Tour Guide
          </h2>
          <p className="mt-1 text-sm leading-sm text-text-secondary">Your path from idea to product</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="inline-flex size-[32px] shrink-0 items-center justify-center rounded-lg text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-subtle hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <Icon icon={Cancel01Icon} size={18} />
        </button>
      </div>
      <div className="px-8 pb-8">
        <ChapterList {...props} />
      </div>
    </FloatingPanel>
  );
}

function ChapterList({ rec, ready, journey, atHome, onStart, onGoHome, onOffers, onReset }: PanelProps) {
  const [phone] = React.useState(isPhone);
  const [reset, setReset] = React.useState(false);
  const groups = [...new Set(TOUR_CHAPTERS.map((c) => c.group))];
  const offers = rec?.offers ?? true;
  const now = journeyNow(journey);
  return (
    <div>
      <section aria-labelledby="tour-journey" className="mt-4 border-b border-solid border-border pb-6">
        <h3 id="tour-journey" className="mb-4 text-sm font-semibold leading-sm text-text-tertiary">
          Your journey
        </h3>
        <Stepper
          label="Your journey"
          steps={JOURNEY.map((s) => ({ label: s.label, state: journey[s.id] ? "completed" : s.id === now ? "active" : "inactive" }))}
        />
      </section>
      {groups.map((group) => (
        <section key={group} aria-label={group} className="mt-4">
          <h3 className="text-sm font-semibold leading-sm text-text-tertiary">{group}</h3>
          <ul role="list" className="flex flex-col">
            {TOUR_CHAPTERS.filter((c) => c.group === group).map((c) => {
              const steps = stepsFor(c, phone);
              const status = chapterStatus(rec, c.id);
              const at = Math.min(status.step, steps.length - 1);
              const readiness = readinessOf(c.id, { phone, ...ready });
              const unit = c.tips ? (steps.length === 1 ? "tip" : "tips") : steps.length === 1 ? "step" : "steps";
              const label =
                status.kind === "done" ? "Replay" : status.kind === "resume" && at > 0 ? `Resume ${at + 1}/${steps.length}` : "Start";
              return (
                <li key={c.id} className="flex items-center gap-6 border-b border-solid border-border py-6 last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <p className={readiness.ok ? "text-md font-medium leading-md text-text-primary" : "text-md font-medium leading-md text-text-secondary"}>
                      {c.name}
                    </p>
                    <p className="text-sm leading-sm text-text-secondary">
                      {readiness.ok ? `${steps.length} ${unit} · ${phone && c.phoneSteps ? "Menu" : c.where}` : readiness.why}
                    </p>
                  </div>
                  {readiness.ok && status.kind === "done" && (
                    <span className="inline-flex items-center gap-2 text-sm font-medium leading-sm text-text-success">
                      <Icon icon={CheckmarkCircle02Icon} size={14} />
                      Seen
                    </span>
                  )}
                  {readiness.ok ? (
                    <Button
                      type="button"
                      hierarchy="secondary"
                      size="sm"
                      className={TAP}
                      aria-label={`${label}: ${c.name}`}
                      onClick={() => onStart(c.id, status.kind === "resume" ? at : 0)}
                    >
                      {label}
                    </Button>
                  ) : (
                    readiness.home &&
                    !atHome && (
                      <button
                        type="button"
                        onClick={onGoHome}
                        className={linkVariants({ color: "brand", size: "md", className: "shrink-0 font-medium" })}
                      >
                        Go to Home
                      </button>
                    )
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <div className="mt-6 flex items-center gap-6 border-t border-solid border-border pt-6">
        <span aria-hidden className="min-w-0 flex-1 text-sm leading-sm text-text-secondary">
          {OFFERS_LABEL}
        </span>
        <Toggle checked={offers} size="sm" aria-label={OFFERS_LABEL} onChange={() => onOffers(!offers)} />
      </div>
      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          onClick={() => {
            onReset();
            setReset(true);
          }}
          className={linkVariants({ color: "brand", size: "md", className: "font-medium" })}
        >
          Reset tours
        </button>
        <p role="status" className="text-sm leading-sm text-text-secondary">
          {reset ? "Done. The welcome shows again on Home." : ""}
        </p>
      </div>
    </div>
  );
}
