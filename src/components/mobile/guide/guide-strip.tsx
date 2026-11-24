"use client";

// The first-product guide on the phone (AUTH-5; the web's GuideCard, components/tour/guide-card):
// the Welcome map's Start with my idea opens it, and it stays with the new user while they make
// their first product. On a phone it is one slim strip in the layout's flow, never over the
// content: above the tab row on the five tabs (tab-bar.tsx), and above the foot on the screens
// where a step happens (screen.tsx, `isGuideScreen`). It says how far along they are and the step
// to do now — "Your first product · 2 of 7" over "Answer the AI's question" — and moves on by
// itself when they have done it (the web's facts, use-guide.ts). A tap opens the guide's sheet:
// the step in full (or what the app is doing while it works), every step with what is done, the
// editor marked "On a computer", and Take me there when the step happens on another screen. ✕
// closes the guide (Undo in the toast). Once every step is done it says so, and its sheet offers
// the phone's tour, as the web's last card offers the full tour.

import * as React from "react";
import { useRouter } from "next/navigation";
import { Cancel01Icon, CheckmarkCircle02Icon, Compass01Icon, LaptopIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button } from "@/components/ideeza/button";
import { ProgressBar } from "@/components/ideeza/progress-bar";
import { Spinner } from "@/components/ideeza/spinner";
import { GUIDE_TITLE } from "@/components/tour/guide-card";
import { updateTour } from "@/components/tour/use-tour";
import { updatePhone } from "@/lib/account/phone";
import { GUIDE_STEPS, guideSteps, type GuideStep } from "@/lib/tour/guide";
import { withGuide } from "@/lib/tour/state";
import type { GuideState } from "@/lib/tour/types";
import { cn } from "@/lib/utils";
import { Chevron } from "../kit/list";
import { PRESSED } from "../kit/press";
import { Sheet } from "../kit/sheet";
import { useToast } from "../kit/toast";
import { T } from "../type";
import { isGuideScreen, useGuideOn, usePhoneGuide, type PhoneGuide } from "./use-guide";
import { GUIDE_DONE, ON_A_COMPUTER, phoneStepWords } from "./words";

/** The strip, while the guide is on. `at`: above the tab row, or above a screen's foot. */
export function GuideStrip({ at }: { at: "tabs" | "screen" }) {
  const on = useGuideOn();
  return on ? <Strip at={at} /> : null;
}

/** On a screen outside the tabs: the strip only where a step happens (screen.tsx). */
export function GuideSlot({ pathname }: { pathname: string }) {
  return isGuideScreen(pathname) ? <GuideStrip at="screen" /> : null;
}

function Strip({ at }: { at: "tabs" | "screen" }) {
  const guide = usePhoneGuide();
  const toast = useToast();
  const [open, setOpen] = React.useState(false);
  if (!guide) return null;
  const { now } = guide;
  const waiting = !!now?.waiting;

  // ✕: the web's Close. Half-way it can be undone; once every step is done the guide is over.
  const close = () => {
    if (!now) {
      updateTour((prev) => withGuide(prev, "done"));
      return;
    }
    const was: GuideState = "open";
    updateTour((prev) => withGuide(prev, "closed"));
    toast({ title: "Guide closed", action: { label: "Undo", onClick: () => updateTour((prev) => withGuide(prev, was)) } });
  };

  const lead = waiting ? (
    <Spinner size={20} />
  ) : (
    <span className={cn("inline-flex shrink-0", now ? "text-[color:var(--color-icon-brand)]" : "text-[color:var(--color-icon-success)]")}>
      <Icon icon={now ? Compass01Icon : CheckmarkCircle02Icon} size={20} />
    </span>
  );
  const said = now ? `${GUIDE_TITLE}, step ${now.index + 1} of ${now.total}: ${now.step.title}` : GUIDE_DONE.title;

  return (
    <div className={cn("px-8", at === "tabs" ? "pt-4" : "pb-4")}>
      <div role="status" aria-live="polite" className="flex items-center overflow-hidden rounded-md border-[length:var(--border-width-1)] border-solid border-border bg-bg-surface">
        <button
          type="button"
          aria-haspopup="dialog"
          aria-label={`${said}. Open the guide`}
          onClick={() => setOpen(true)}
          className={cn(
            "flex min-h-[44px] min-w-0 flex-1 items-center gap-6 py-1 pl-6 pr-2 text-left outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus",
            PRESSED,
          )}
        >
          {lead}
          <span className="flex min-w-0 flex-1 flex-col">
            {now ? (
              <>
                <span className={cn(T.meta, "truncate tabular-nums")}>
                  {GUIDE_TITLE} · {now.index + 1} of {now.total}
                </span>
                <span className={cn(T.rowTitle, "truncate")}>{now.step.title}</span>
              </>
            ) : (
              <span className={cn(T.rowTitle, "truncate")}>{GUIDE_DONE.title}</span>
            )}
          </span>
          <Chevron />
        </button>
        <button
          type="button"
          aria-label="Close the guide"
          onClick={close}
          className={cn(
            "inline-flex size-[44px] shrink-0 items-center justify-center rounded-md text-[color:var(--color-icon-default)] outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
            PRESSED,
          )}
        >
          <Icon icon={Cancel01Icon} size={16} />
        </button>
      </div>
      <GuideSheet open={open} onClose={() => setOpen(false)} guide={guide} />
    </div>
  );
}

function GuideSheet({ open, onClose, guide }: { open: boolean; onClose: () => void; guide: PhoneGuide }) {
  const router = useRouter();
  const { now, href, here } = guide;

  if (!now) {
    const tour = () => {
      updateTour((prev) => withGuide(prev, "done"));
      updatePhone({ tourPending: true });
      onClose();
      router.push("/m");
    };
    return (
      <Sheet
        open={open}
        onClose={onClose}
        title={GUIDE_DONE.title}
        description={GUIDE_DONE.body}
        actions={
          <Button size="xl" className="w-full" onClick={tour}>
            {GUIDE_DONE.action}
          </Button>
        }
      >
        <ProgressBar value={100} label="Every step done" />
        <StepList guide={guide} />
      </Sheet>
    );
  }

  const go = href && !here ? href : null;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={GUIDE_TITLE}
      description={`Step ${now.index + 1} of ${now.total}`}
      actions={
        go ? (
          <Button
            size="xl"
            className="w-full"
            onClick={() => {
              onClose();
              router.push(go);
            }}
          >
            Take me there
          </Button>
        ) : undefined
      }
    >
      <ProgressBar value={(now.index / now.total) * 100} label={`${now.index} of ${now.total} steps done`} />
      <div className="flex flex-col gap-2">
        <h3 className={T.section}>{now.step.title}</h3>
        <p className={cn(T.body, "flex items-start gap-4")}>
          {now.waiting && (
            <span className="mt-[2px] inline-flex shrink-0">
              <Spinner size={16} />
            </span>
          )}
          <span className="min-w-0 flex-1">{phoneStepWords(now.step, now.waiting)}</span>
        </p>
      </div>
      <StepList guide={guide} />
    </Sheet>
  );
}

/** Every step of the web's guide in its order: done, now, still to come; the editor, which the
 *  phone leaves out of its count, marked as needing a computer (ticked once it was opened there). */
function StepList({ guide }: { guide: PhoneGuide }) {
  const walk = guideSteps(true);
  const at = guide.now?.index ?? walk.length;
  const stateOf = (s: GuideStep): "done" | "now" | "next" | "computer" => {
    const i = walk.findIndex((w) => w.id === s.id);
    if (i < 0) return guide.facts.editorSeen ? "done" : "computer";
    return i < at ? "done" : i === at ? "now" : "next";
  };
  return (
    <ol aria-label="The steps" className="flex flex-col gap-6">
      {GUIDE_STEPS.map((s) => {
        const state = stateOf(s);
        const n = walk.findIndex((w) => w.id === s.id) + 1;
        return (
          <li key={s.id} aria-current={state === "now" ? "step" : undefined} className="flex min-h-[32px] items-center gap-6">
            <span
              aria-hidden
              className={cn(
                T.label,
                "inline-flex size-[32px] shrink-0 items-center justify-center rounded-full border-[length:var(--border-width-1)] border-solid tabular-nums",
                state === "now"
                  ? "border-transparent bg-bg-brand text-[color:var(--color-text-on-brand)]"
                  : state === "done"
                    ? "border-transparent bg-bg-success-subtle text-[color:var(--color-icon-success)]"
                    : "border-border text-text-secondary",
              )}
            >
              {state === "done" ? (
                <Icon icon={CheckmarkCircle02Icon} size={20} />
              ) : state === "computer" ? (
                <Icon icon={LaptopIcon} size={16} />
              ) : (
                n
              )}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className={cn(T.rowTitle, state === "next" || state === "computer" ? "text-text-secondary" : undefined)}>{s.title}</span>
              {n === 0 && <span className={T.meta}>{ON_A_COMPUTER}</span>}
            </span>
            {state !== "computer" && <span className="sr-only">{state === "done" ? "(done)" : state === "now" ? "(now)" : "(to do)"}</span>}
          </li>
        );
      })}
    </ol>
  );
}
