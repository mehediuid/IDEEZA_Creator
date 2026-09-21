"use client";

// ConfirmBuildDialog — the last step before the credits move.
//
// It used to be the whole decision: which products the build covers, the
// five deliverables it produces, a field for naming a product the classifier
// had missed, and a preview of every concept. None of that belongs here any
// more. The products are settled at the question, before anything is drawn,
// and they are on the canvas immediately behind this dialog; the five
// deliverables are the same five on every build, so they decide nothing; and
// adding a product now happens on the canvas, where the others are.
//
// What is left is the part that is actually a decision: money is about to
// move, and two sentences have to be read before it does. Part 4 §4.5 asks
// for them by name, because they are what stops a Draft result turning into
// a refund dispute — the concept images are a reference, and a build that
// fails its checks still ships, labelled.
//
// So this is a confirmation, not a form. If it ever grows a third thing to
// decide, that thing belongs on the canvas instead.

import * as React from "react";
import {
  Cancel01Icon,
  Coins01Icon,
  FlashIcon,
  InformationCircleIcon,
  Refresh01Icon,
  ShieldKeyIcon,
} from "@hugeicons/core-free-icons";
import type { IconValue } from "@/components/dashboard/icon";
import { Icon } from "@/components/dashboard/icon";
import { Checkbox } from "@/components/ideeza";
import { writeGateDismissed } from "@/lib/create/gate-preference";
import { BUILD_COST, useCredits } from "@/lib/create/credits";
import { BUILD_ESTIMATE_MIN } from "@/lib/create/history";
import {
  describeFallback,
  fallbackConcept,
  type ConceptSummary,
} from "@/lib/create/concept";

// A window rather than a second number: the estimate is an estimate.
const ESTIMATE_WINDOW = 2;
const TIME_CHIP = `About ${BUILD_ESTIMATE_MIN - ESTIMATE_WINDOW}–${
  BUILD_ESTIMATE_MIN + ESTIMATE_WINDOW
} minutes`;

// One summarize call per concept: reopening the dialog on the same turn
// shows what it read the first time instead of asking again.
const summaryCache = new Map<string, ConceptSummary>();

// In-flight requests, keyed the same way — a quick close/reopen (or a
// second mount) while the round-trip is still out reuses this promise
// instead of firing a second /api/concept/summarize call.
const pendingSummaries = new Map<string, Promise<ConceptSummary>>();

export function summarizeConcept(
  turnId: string,
  prompt: string,
): Promise<ConceptSummary> {
  const cached = summaryCache.get(turnId);
  if (cached) return Promise.resolve(cached);
  const pending = pendingSummaries.get(turnId);
  if (pending) return pending;
  const request = (async (): Promise<ConceptSummary> => {
    try {
      const res = await fetch("/api/concept/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error("summarize failed");
      const data = (await res.json()) as Partial<ConceptSummary>;
      if (!data.title || !Array.isArray(data.parts) || !data.parts.length) {
        throw new Error("empty concept");
      }
      return {
        title: data.title,
        summary: data.summary ?? "",
        description: data.description ?? describeFallback(prompt),
        parts: data.parts,
      };
    } catch {
      // The same deterministic concept the route falls back to, so a
      // build started offline still carries a real parts list.
      return fallbackConcept(prompt);
    }
  })();
  pendingSummaries.set(turnId, request);
  // The cache used to be written by the dialog's own effect, so a path that
  // never opens the dialog — a dismissed gate — asked the model the same
  // question twice for the same concept, once to read it back and once to
  // file the build under it. The answer is filed here, where it is made.
  void request.then((concept) => summaryCache.set(turnId, concept));
  request.finally(() => pendingSummaries.delete(turnId));
  return request;
}

export function ConfirmBuildDialog({
  open,
  turnId,
  conceptPrompt,
  products,
  onCancel,
  onConfirm,
  submitting,
}: {
  open: boolean;
  /** The concept this build comes from — the cache key for its summary. */
  turnId: string;
  conceptPrompt: string;
  /** How many products the build covers. The price is per product, and the
   *  canvas behind this dialog says the same number. */
  products: number;
  onCancel: () => void;
  onConfirm: (concept: ConceptSummary) => void;
  submitting: boolean;
}) {
  const { hydrated: creditsHydrated, balance } = useCredits();
  // Unticked on every open: the stored preference already hides the whole
  // dialog, so a user seeing this is a user who has not dismissed it.
  const [dismiss, setDismiss] = React.useState(false);
  const [resolved, setResolved] = React.useState<{
    turnId: string;
    concept: ConceptSummary;
  } | null>(null);

  // The concept the build is filed under. Read in the background, with the
  // same deterministic fallback the route uses standing in meanwhile, so
  // Confirm is never blocked on a network round-trip.
  const concept =
    summaryCache.get(turnId) ??
    (resolved && resolved.turnId === turnId ? resolved.concept : null) ??
    fallbackConcept(conceptPrompt);

  React.useEffect(() => {
    if (!open || !turnId || summaryCache.has(turnId)) return;
    let live = true;
    summarizeConcept(turnId, conceptPrompt).then((result) => {
      summaryCache.set(turnId, result);
      if (!live) return;
      setResolved({ turnId, concept: result });
    });
    return () => {
      live = false;
    };
  }, [open, turnId, conceptPrompt]);

  // Esc / outside-click dismiss.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const cost = BUILD_COST * Math.max(1, products);
  // The rendered balance rather than canAfford(): the credits provider
  // refreshes that ref in its own effect, which runs after ours, so it
  // reads a render behind here (chat-thread.tsx reads it the same way).
  const shortOnCredits = creditsHydrated && balance < cost;
  const blocked = shortOnCredits || submitting;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-build-title"
      onClick={onCancel}
      className="fixed inset-0 z-modal flex items-center justify-center px-[16px] py-[24px]"
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--color-bg-overlay)_62%,transparent)] backdrop-blur-sm"
      />

      <div
        data-testid="generate-modal"
        onClick={(e) => e.stopPropagation()}
        className="relative flex w-full max-w-[440px] flex-col gap-[16px] rounded-2xl border border-solid border-border bg-bg-surface p-[24px] shadow-3"
      >
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="absolute right-[14px] top-[14px] inline-flex h-[28px] w-[28px] items-center justify-center rounded-lg text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-subtle hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <Icon icon={Cancel01Icon} size={16} />
        </button>

        <div className="flex flex-col gap-[6px] pr-[32px]">
          <h2
            id="confirm-build-title"
            className="text-lg font-semibold text-text-primary"
          >
            {products > 1
              ? `Engineer ${products} products?`
              : "Engineer this product?"}
          </h2>
          <p className="text-sm leading-relaxed text-text-secondary">
            {concept.title}
            {products > 1 ? ` and ${products - 1} more` : ""}. The build runs in
            the background — you can leave, and we&apos;ll tell you when each
            piece is ready.
          </p>
        </div>

        {/* §4.5 — both of these are on screen before any money moves. They
            are what stops a Draft result becoming a refund dispute. */}
        <div className="flex flex-col gap-[8px] rounded-xl bg-bg-subtle p-[14px]">
          <p className="text-sm leading-relaxed text-text-secondary">
            Your concept images are a visual reference. The engineered output
            may differ from them.
          </p>
          <p className="text-sm leading-relaxed text-text-secondary">
            Automated design rule checks run on completion. If issues are
            found, you&apos;ll still receive the full output with a{" "}
            <strong className="font-semibold text-text-primary">Draft</strong>{" "}
            label and a list of what needs review.
          </p>
        </div>

        <div className="flex flex-wrap gap-[8px]">
          <Chip icon={Coins01Icon}>
            {cost} credits
            {shortOnCredits ? ` · you have ${balance}` : ""}
          </Chip>
          <Chip icon={InformationCircleIcon}>{TIME_CHIP}</Chip>
          <Chip icon={ShieldKeyIcon}>No wallet or KYC yet</Chip>
        </div>

        <div className="flex items-center gap-[12px] border-t border-solid border-border pt-[16px]">
          <label className="flex cursor-pointer select-none items-center gap-[8px] text-sm text-text-tertiary">
            <Checkbox
              checked={dismiss}
              onChange={() => setDismiss((v) => !v)}
              size="sm"
              aria-label="Don't show this again"
            />
            Don&apos;t show this again
          </label>
          <button
            type="button"
            onClick={onCancel}
            className="ml-auto inline-flex h-[40px] items-center rounded-lg border border-solid border-border bg-bg-surface px-[14px] text-md font-semibold text-text-secondary outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            Cancel
          </button>
          {/* Busy is a spinner, not a word swap. Confirming reads each
              product's concept back before the build can be booked, which is
              a round-trip per product, and "Generate" quietly becoming
              "Starting…" in the same violet button was easy to miss — people
              pressed it again believing they had missed it. It keeps the
              brand fill (this is still the primary action, now under way),
              dims, takes the wait cursor and turns. */}
          <button
            type="button"
            data-testid="gate-confirm"
            disabled={blocked}
            aria-busy={submitting}
            title={
              shortOnCredits
                ? "Not enough credits"
                : submitting
                  ? "Booking the build…"
                  : undefined
            }
            onClick={() => {
              if (dismiss) writeGateDismissed(true);
              onConfirm(concept);
            }}
            className={
              shortOnCredits
                ? "inline-flex h-[40px] cursor-not-allowed items-center gap-[8px] rounded-lg bg-bg-subtle px-[16px] text-md font-semibold text-text-disabled"
                : submitting
                  ? "inline-flex h-[40px] cursor-wait items-center gap-[8px] rounded-lg bg-bg-brand px-[16px] text-md font-semibold text-text-on-brand opacity-80"
                  : "inline-flex h-[40px] items-center gap-[8px] rounded-lg bg-bg-brand px-[16px] text-md font-semibold text-text-on-brand outline-none transition-colors duration-fast hover:bg-bg-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus"
            }
          >
            <span
              aria-hidden
              className={submitting ? "inline-flex motion-safe:animate-spin" : "inline-flex"}
            >
              <Icon icon={submitting ? Refresh01Icon : FlashIcon} size={16} />
            </span>
            {submitting ? "Starting the build…" : "Generate"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Chip({
  icon,
  children,
}: {
  icon: IconValue;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-[6px] rounded-full border border-solid border-border px-[10px] py-[5px] text-sm text-text-secondary">
      <span aria-hidden className="text-text-tertiary">
        <Icon icon={icon} size={14} />
      </span>
      {children}
    </span>
  );
}
