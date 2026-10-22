"use client";

// The Tour Guide panel (spec D5): every chapter, under Start, Build and Earn & share, with Start,
// Replay or Resume where it stopped — or, when it can't start yet, why and the way there (D6).
// Below them,
// whether a page's tour is offered on a first visit, and Reset tours. From the sidebar's Support ›
// Tour Guide it floats beside the sidebar, the way the footer's account popover does; from ⌘K or
// the phone's menu it is a dialog (a bottom sheet on a phone).

import * as React from "react";
import { ArrowRight01Icon, Cancel01Icon, CheckmarkCircle02Icon, CircleIcon, LockIcon, PlayCircleIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { FloatingPanel } from "@/components/dashboard/sidebar-account";
import { ModalFrame, Toggle, linkVariants } from "@/components/ideeza";
import { TOUR_CHAPTERS } from "@/lib/tour/chapters";
import { readinessOf } from "@/lib/tour/places";
import { chapterStatus } from "@/lib/tour/state";
import type { ChapterId, TourRecord } from "@/lib/tour/types";
import { cn } from "@/lib/utils";
import { isPhone, isShown } from "./targets";

const OFFERS_LABEL = "Offer a tour the first time I open a page";

type PanelProps = {
  /** Support › Tour Guide in the sidebar, when that is what opened it. */
  anchor: HTMLElement | null;
  rec: TourRecord | null;
  /** What the chapters that run on your own work need. */
  ready: { hasProject: boolean; hasChat: boolean };
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

function ChapterList({ rec, ready, atHome, onStart, onGoHome, onOffers, onReset }: PanelProps) {
  const [phone] = React.useState(isPhone);
  const [reset, setReset] = React.useState(false);
  const groups = [...new Set(TOUR_CHAPTERS.map((c) => c.group))];
  const offers = rec?.offers ?? true;
  return (
    <div>
      {groups.map((group) => (
        <section key={group} aria-label={group} className="mt-6 first:mt-4">
          <h3 className="mb-2 text-sm font-semibold leading-sm text-text-tertiary">{group}</h3>
          <ul role="list" className="-mx-4 flex flex-col gap-1">
            {TOUR_CHAPTERS.filter((c) => c.group === group).map((c) => {
              const steps = c.steps;
              const status = chapterStatus(rec, c.id);
              const at = Math.min(status.step, steps.length - 1);
              const readiness = readinessOf(c.id, { phone, ...ready });
              const unit = c.tips ? (steps.length === 1 ? "tip" : "tips") : steps.length === 1 ? "step" : "steps";
              const resume = status.kind === "resume" && at > 0;
              const label = status.kind === "done" ? "Replay" : resume ? `Resume ${at + 1}/${steps.length}` : "Start";
              if (!readiness.ok) {
                return (
                  <li key={c.id} className="flex items-center gap-6 px-4 py-4">
                    <span aria-hidden className="inline-flex size-[20px] shrink-0 items-center justify-center text-text-tertiary">
                      <Icon icon={LockIcon} size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-md font-medium leading-md text-text-secondary">{c.name}</span>
                      <span className="block text-sm leading-sm text-text-secondary">{readiness.why}</span>
                    </span>
                    {readiness.home && !atHome && (
                      <button
                        type="button"
                        onClick={onGoHome}
                        className={linkVariants({ color: "brand", size: "md", className: "shrink-0 font-semibold" })}
                      >
                        Go to Home
                      </button>
                    )}
                  </li>
                );
              }
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    aria-label={`${label}: ${c.name}${status.kind === "done" ? ", seen" : ""}`}
                    onClick={() => onStart(c.id, resume ? at : 0)}
                    className="group flex w-full items-center gap-6 rounded-lg px-4 py-4 text-left outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
                  >
                    <StatusMark kind={status.kind === "done" ? "done" : resume ? "resume" : "new"} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-md font-medium leading-md text-text-primary">{c.name}</span>
                      <span className="block text-sm leading-sm text-text-secondary">
                        {steps.length} {unit} · {c.where}
                      </span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold leading-sm text-text-brand">
                      {label}
                      <span aria-hidden className="inline-flex motion-safe:transition-transform motion-safe:duration-fast group-hover:translate-x-1">
                        <Icon icon={ArrowRight01Icon} size={14} />
                      </span>
                    </span>
                  </button>
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
          className={linkVariants({ color: "neutral", size: "md", className: "font-medium" })}
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

/** Where a chapter stands, at a glance: seen, part-way, or not yet. */
function StatusMark({ kind }: { kind: "done" | "resume" | "new" }) {
  const icon = kind === "done" ? CheckmarkCircle02Icon : kind === "resume" ? PlayCircleIcon : CircleIcon;
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-[20px] shrink-0 items-center justify-center",
        kind === "done" ? "text-text-success" : kind === "resume" ? "text-text-brand" : "text-text-tertiary",
      )}
    >
      <Icon icon={icon} size={18} />
    </span>
  );
}
