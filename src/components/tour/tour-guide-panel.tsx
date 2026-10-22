"use client";

// The Tour Guide panel (spec D5): every chapter with Start, Replay or Resume where it stopped, and
// Reset tours. From the sidebar's Support › Tour Guide it floats beside the sidebar, the way the
// footer's account popover does; from ⌘K or the phone's menu it is a dialog (a bottom sheet on a
// phone).

import * as React from "react";
import { Cancel01Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { FloatingPanel } from "@/components/dashboard/sidebar-account";
import { Button, ModalFrame, linkVariants } from "@/components/ideeza";
import { TOUR_CHAPTERS, stepsFor } from "@/lib/tour/chapters";
import { chapterStatus } from "@/lib/tour/state";
import type { ChapterId, TourRecord } from "@/lib/tour/types";
import { isPhone, isShown } from "./targets";

// A finger's reach on a phone or a touch screen, as ModalFrame's buttons have.
const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

type PanelProps = {
  /** Support › Tour Guide in the sidebar, when that is what opened it. */
  anchor: HTMLElement | null;
  rec: TourRecord | null;
  onStart: (id: ChapterId, step: number) => void;
  onReset: () => void;
  onClose: () => void;
};

export function TourGuidePanel(props: PanelProps) {
  const { anchor } = props;
  // Decided once, on open: beside the link if it is on screen, a dialog otherwise.
  const [beside] = React.useState(() => !!anchor && isShown(anchor) && !isPhone());
  return beside && anchor ? <BesideSidebar {...props} anchor={anchor} /> : <AsDialog {...props} />;
}

function AsDialog({ rec, onStart, onReset, onClose }: PanelProps) {
  return (
    <ModalFrame open onClose={onClose} size="sm" sheet title="Tour Guide" description="Your path from idea to product">
      <ChapterList rec={rec} onStart={onStart} onReset={onReset} />
    </ModalFrame>
  );
}

function BesideSidebar({ anchor, rec, onStart, onReset, onClose }: PanelProps & { anchor: HTMLElement }) {
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
      width={320}
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
      <div className="flex items-start gap-4 px-8 pb-4 pt-8">
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
        <ChapterList rec={rec} onStart={onStart} onReset={onReset} />
      </div>
    </FloatingPanel>
  );
}

function ChapterList({ rec, onStart, onReset }: Pick<PanelProps, "rec" | "onStart" | "onReset">) {
  const [phone] = React.useState(isPhone);
  const [reset, setReset] = React.useState(false);
  return (
    <div>
      <ul role="list" className="flex flex-col">
        {TOUR_CHAPTERS.map((c) => {
          const steps = stepsFor(c, phone);
          const status = chapterStatus(rec, c.id);
          const at = Math.min(status.step, steps.length - 1);
          const label = status.kind === "done" ? "Replay" : status.kind === "resume" && at > 0 ? `Resume ${at + 1}/${steps.length}` : "Start";
          return (
            <li key={c.id} className="flex items-center gap-6 border-b border-solid border-border py-6 last:border-b-0">
              <div className="min-w-0 flex-1">
                <p className="text-md font-medium leading-md text-text-primary">{c.name}</p>
                <p className="text-sm leading-sm text-text-secondary">
                  {steps.length} {steps.length === 1 ? "step" : "steps"} · {phone && c.phoneSteps ? "Menu" : c.where}
                </p>
              </div>
              {status.kind === "done" && (
                <span className="inline-flex items-center gap-2 text-sm font-medium leading-sm text-text-success">
                  <Icon icon={CheckmarkCircle02Icon} size={14} />
                  Seen
                </span>
              )}
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
            </li>
          );
        })}
      </ul>
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
