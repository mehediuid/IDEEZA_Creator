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
} from "@hugeicons/core-free-icons";
import type { IconValue } from "@/components/dashboard/icon";
import { Icon } from "@/components/dashboard/icon";
import { buildCost, useCredits } from "@/lib/create/credits";
import { useDialogFocus } from "./use-dialog-focus";
import { BUILD_ESTIMATE_MIN } from "@/lib/create/history";
import {
  describeFallback,
  fallbackConcept,
  type ConceptSummary,
} from "@/lib/create/concept";
import { asConceptSummary } from "@/lib/spec/hints";

// The estimate in words — a build here takes about a minute.
const TIME_CHIP =
  BUILD_ESTIMATE_MIN <= 1
    ? "About a minute"
    : `About ${BUILD_ESTIMATE_MIN} minutes`;

// One summarize call per concept: reopening the dialog on the same turn
// shows what it read the first time instead of asking again. Only a real
// reading is filed — a stand-in kept here would answer every later caller
// with the generic parts for the rest of the session.
const summaryCache = new Map<string, ConceptSummary>();

// In-flight requests, keyed the same way — a quick close/reopen (or a
// second mount) while the round-trip is still out reuses this promise
// instead of firing a second /api/concept/summarize call.
const pendingSummaries = new Map<string, Promise<ConceptSummary>>();

// Pollinations queues one request per IP and answers a second with a 429
// that sends it to the fallback — so every summarize call made through
// `summarizeConcept` (the background reader, Read again, the Build path and
// the gate) goes through this one line, each request starting when the one
// ahead of it has answered. It serialises those callers only: the setup
// question's own two readings and Enhance go straight to the network,
// outside it.
let queue: Promise<unknown> = Promise.resolve();

export function summarizeConcept(
  turnId: string,
  prompt: string,
  /** The reading already kept on the turn — used as is, no request. A kept
   *  stand-in is not a reading, so it is asked again instead. */
  known?: ConceptSummary,
  /** The companion's own name, when `prompt` is a companion's brief
   *  ("{name} for {the maker's idea}"): the stand-in reads the product's own
   *  words, not the idea it serves. Absent for the primary. */
  companion?: string,
): Promise<ConceptSummary> {
  if (known && !known.fallback) summaryCache.set(turnId, known);
  const cached = summaryCache.get(turnId);
  if (cached) return Promise.resolve(cached);
  const pending = pendingSummaries.get(turnId);
  if (pending) return pending;
  const request = queue.then(async (): Promise<ConceptSummary> => {
    try {
      const res = await fetch("/api/concept/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(companion ? { prompt, companion } : { prompt }),
      });
      if (!res.ok) throw new Error("summarize failed");
      // Checked the way a stored reading is, so what is kept on the turn
      // always reads back — and `fallback` comes through only as the route
      // said it.
      const data: unknown = await res.json();
      const read = asConceptSummary(data);
      if (!read || !(data as { title?: unknown }).title) throw new Error("empty concept");
      return { ...read, description: read.description || describeFallback(prompt) };
    } catch {
      // The same deterministic concept the route falls back to, so a
      // build started offline still carries a real parts list — marked as
      // the stand-in it is.
      return fallbackConcept(prompt, companion);
    }
  });
  queue = request.catch(() => null);
  pendingSummaries.set(turnId, request);
  // The cache used to be written by the dialog's own effect, so a path that
  // never opens the dialog — a dismissed gate — asked the model the same
  // question twice for the same concept, once to read it back and once to
  // file the build under it. The answer is filed here, where it is made.
  void request.then((concept) => {
    if (!concept.fallback) summaryCache.set(turnId, concept);
  });
  request.finally(() => pendingSummaries.delete(turnId));
  return request;
}

export function ConfirmBuildDialog({
  open,
  turnId,
  conceptPrompt,
  companionName,
  initialConcept,
  products,
  productNames = [],
  specLines,
  onCancel,
  onConfirm,
  submitting,
}: {
  open: boolean;
  /** The concept this build comes from — the cache key for its summary. */
  turnId: string;
  conceptPrompt: string;
  /** The companion's own name, when this is a companion's concept — see
   *  `summarizeConcept`. */
  companionName?: string;
  /** The reading Build already did for this turn — real or stand-in. When
   *  given, the dialog shows it as is and does not ask again: Build just
   *  read this same turn, on a stand-in or not, and a second ask here for a
   *  stand-in primary sent a request the maker never saw the point of. */
  initialConcept?: ConceptSummary;
  /** How many products the build covers. The price is per product, and the
   *  canvas behind this dialog says the same number. */
  products: number;
  /** What the canvas calls each product being paid for. "and 1 more" asked
   *  the maker to pay for a product the dialog would not name. */
  productNames?: string[];
  /** One line per product — size · board · power — so what each build will
   *  be is on screen before the credits move. */
  specLines: string[];
  onCancel: () => void;
  onConfirm: (concept: ConceptSummary) => void;
  submitting: boolean;
}) {
  const { hydrated: creditsHydrated, balance } = useCredits();
  const panelRef = React.useRef<HTMLDivElement>(null);
  // Focus in on open, held inside while open, back to the build button on
  // close — focus used to stay on <body> with the page behind still tabbable.
  useDialogFocus(open, panelRef);
  const [resolved, setResolved] = React.useState<{
    turnId: string;
    concept: ConceptSummary;
  } | null>(null);

  // The concept the build is filed under. `initialConcept` is what Build
  // itself just read for this turn, so it outranks a fresh fallback and — via
  // the effect below — stands in for reading it again. Absent that, the same
  // deterministic fallback the route uses stands in meanwhile, so Confirm is
  // never blocked on a network round-trip.
  const concept =
    summaryCache.get(turnId) ??
    initialConcept ??
    (resolved && resolved.turnId === turnId ? resolved.concept : null) ??
    fallbackConcept(conceptPrompt, companionName);

  React.useEffect(() => {
    if (!open || !turnId || summaryCache.has(turnId) || initialConcept) return;
    let live = true;
    // summarizeConcept files a real reading itself, and a stand-in must not
    // be filed at all — so this only shows what came back.
    summarizeConcept(turnId, conceptPrompt, undefined, companionName).then((result) => {
      if (!live) return;
      setResolved({ turnId, concept: result });
    });
    return () => {
      live = false;
    };
  }, [open, turnId, conceptPrompt, companionName, initialConcept]);

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

  const cost = buildCost(products);
  // The rendered balance rather than canAfford(): the credits provider
  // refreshes that ref in its own effect, which runs after ours, so it
  // reads a render behind here (chat-thread.tsx reads it the same way).
  const shortOnCredits = creditsHydrated && balance < cost;
  const blocked = shortOnCredits || submitting;

  return (
    <div
      onClick={onCancel}
      className="fixed inset-0 z-modal flex items-center justify-center px-[16px] py-[24px]"
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--color-bg-overlay)_62%,transparent)] backdrop-blur-sm"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-build-title"
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
            {products > 1 ? `Build ${products} products?` : "Build this product?"}
          </h2>
          <p className="text-sm leading-relaxed text-text-secondary">
            {productNames.length === products
              ? new Intl.ListFormat("en", { type: "conjunction" }).format(productNames)
              : `${concept.title}${products > 1 ? ` and ${products - 1} more` : ""}`}
            . The build runs in
            the background — you can leave, and we&apos;ll tell you when each
            piece is ready.
          </p>
        </div>

        {specLines.length > 0 && (
          <ul role="list" aria-label="What each product will be" className="flex flex-col gap-[6px]">
            {/* By position: two products can read the same line. */}
            {specLines.map((line, i) => (
              <li key={i} className="text-sm leading-relaxed text-text-primary">
                {line}
              </li>
            ))}
          </ul>
        )}

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
          {/* The balance on both sides of the spend, so the maker sees what
              they have and what they will have — not only the price. */}
          <Chip icon={Coins01Icon}>
            {cost} credits
            {creditsHydrated
              ? shortOnCredits
                ? ` · you have ${balance}`
                : ` · ${balance} → ${balance - cost} after`
              : ""}
          </Chip>
          <Chip icon={InformationCircleIcon}>{TIME_CHIP}</Chip>
        </div>

        <div className="flex items-center gap-[12px] border-t border-solid border-border pt-[16px]">
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
            onClick={() => onConfirm(concept)}
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
            {submitting ? "Starting…" : "Build"}
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
