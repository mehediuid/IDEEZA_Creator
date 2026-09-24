"use client";

// ImageTurn — one product's current concept on the chat canvas. Either:
//   • Pending  — a bare rendering tile: dotted texture + a centred
//                "Drawing <product> · P%" pill, no card chrome
//   • Ready    — the product's name with its concept number beside it, the
//                image, the prompt on one line with a copy button, then
//                Refine · Regenerate and what each costs
//   • Failed   — error card with a retry control
//
// Spec §4b: regenerate is a FRESH from-scratch take; refinement is a change
// described in the editor or the composer.
//
// Spec §4c: the concept number carries lineage ("1.2" is the second refine
// of concept 1), so it stays on the card — as metadata beside the product's
// name, which is what the card is actually of.
//
// The build is one action for the whole canvas (see chat-thread.tsx), so no
// card carries a build button of its own.

import * as React from "react";
import {
  Alert02Icon,
  CheckmarkBadge01Icon,
  Coins01Icon,
  Copy01Icon,
  Delete02Icon,
  MagicWand01Icon,
  Refresh01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { Icon } from "@/components/dashboard/icon";
import { Checkbox } from "@/components/ideeza/checkbox";
import { BUILD_COST, CONCEPT_COST, useCredits } from "@/lib/create/credits";
import type { ChatTurn, ConceptFailReason } from "@/lib/create/history";
import { useMinuteClock } from "./build-status";
import { elapsedLabel, useSecondClock } from "./use-clock";

/** Said on both concept controls when the balance cannot cover a render. */
const NO_RENDER = `Not enough credits — a concept render costs ${CONCEPT_COST}`;

const OUTLINE_BUTTON =
  "inline-flex h-[36px] items-center gap-[8px] rounded-lg border border-solid border-border bg-bg-surface px-[12px] text-sm font-medium text-text-secondary outline-none transition-colors duration-fast hover:border-border-strong hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus";
const OUTLINE_BUTTON_OFF =
  "inline-flex h-[36px] items-center gap-[8px] rounded-lg border border-solid border-border bg-bg-subtle px-[12px] text-sm font-medium text-text-disabled outline-none";

export function ImageTurn({
  turn,
  conceptLabel,
  parentConceptLabel,
  productName,
  inBuild = false,
  regenerating = false,
  onRegenerate,
  onRefine,
  buildChoice,
  onRemove,
}: {
  turn: Extract<ChatTurn, { role: "assistant" }>;
  conceptLabel: string;
  parentConceptLabel?: string;
  /** What this card is a drawing OF. Without it a charger read as
   *  "Concept 2" — an alternative take on the phone rather than a second
   *  product. The lineage number stays, as metadata under the name. */
  productName?: string;
  /** This exact drawing is what the current build was made from. */
  inBuild?: boolean;
  regenerating?: boolean;
  onRegenerate: () => void;
  onRefine: () => void;
  /** Whether this product goes into the next build. `locked` for the
   *  concept the project started from, which is always built (Part 4
   *  §4.4.4); the tick is shown, and says why it cannot be cleared. */
  buildChoice?: { included: boolean; locked?: boolean; onToggle?: () => void };
  /** Takes the product out of the project. Absent for the primary. */
  onRemove?: () => void;
}) {
  const [imgOk, setImgOk] = React.useState(true);
  // The rendered balance, not canAfford(): that reads a ref the provider
  // refreshes in its OWN effect, and a provider's effects run after its
  // children's — so from here the ref is a render behind (the build
  // simulator reads the balance the same way, for the same reason).
  // Before the ledger has read storage its balance is 0, so the gate
  // waits for `hydrated` rather than greying every card on load.
  const { hydrated: creditsHydrated, balance } = useCredits();
  const shortForRender = creditsHydrated && balance < CONCEPT_COST;

  const what = productName ?? `concept ${conceptLabel}`;
  const tick = buildChoice ? <BuildTick what={what} choice={buildChoice} /> : null;
  const remove = onRemove ? <RemoveButton what={what} onRemove={onRemove} /> : null;
  const leftOut = !!buildChoice && !buildChoice.included;

  // A drawing still under way, or one that failed, has no header of its
  // own; the product's name and its two choices sit on a line above it, so
  // a failed remote can be left out or removed rather than holding up the
  // whole build.
  const withChoices = (tile: React.ReactNode) =>
    tick || remove ? (
      <div className="flex w-full max-w-[640px] flex-col gap-[8px]">
        <div className="flex items-center gap-[8px]">
          {tick}
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">
            {productName ?? `Concept ${conceptLabel}`}
          </span>
          {remove}
        </div>
        {tile}
      </div>
    ) : (
      tile
    );

  if (turn.status === "pending") {
    return withChoices(
      <PendingImageTurn
        conceptLabel={conceptLabel}
        parentConceptLabel={parentConceptLabel}
        productName={productName}
        kind={turn.kind}
        since={turn.ts}
      />,
    );
  }
  if (turn.status === "failed") {
    return withChoices(
      <FailedImageTurn
        reason={turn.failReason}
        onRetry={onRegenerate}
        disabled={shortForRender}
      />,
    );
  }

  // status === "ready"
  const name = productName ? `${productName}, concept ${conceptLabel}` : `Concept ${conceptLabel}`;
  return (
    <article
      aria-label={name}
      className="flex w-full max-w-[640px] flex-col gap-[12px] rounded-2xl border border-border bg-bg-surface p-[16px]"
    >
      <ConceptHeader
        conceptLabel={conceptLabel}
        productName={productName}
        ts={turn.ts}
        lead={tick}
        trail={remove}
      />

      {/* The picture is the picture. It used to be a hidden Refine button,
          which nobody expects of an image — a click on one means "show me
          it bigger" — and it made two Refine controls on one card. */}
      {turn.imageUrl && imgOk ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={turn.imageUrl}
          alt={`${name}: ${turn.prompt}`}
          onError={() => setImgOk(false)}
          className={[
            "aspect-[16/10] w-full rounded-xl object-cover transition-opacity duration-fast",
            leftOut ? "opacity-50" : "",
          ].join(" ")}
        />
      ) : turn.imageUrl ? (
        <div className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-[8px] rounded-xl bg-bg-surface-raised px-[16px] text-center">
          <p className="text-sm text-text-tertiary">
            Couldn&apos;t load this image.
          </p>
        </div>
      ) : null}

      <div className="flex items-center gap-[8px]">
        <p className="min-w-0 flex-1 truncate text-sm text-text-tertiary">
          <span className="font-semibold text-text-secondary">Prompt: </span>
          {turn.prompt}
        </p>
        <CopyPromptButton prompt={turn.prompt} />
      </div>

      <div aria-hidden className="h-px w-full bg-border" />

      <div className="flex flex-wrap items-center gap-[8px]">
        <button
          type="button"
          onClick={onRefine}
          disabled={shortForRender}
          aria-label={`Refine ${name} — ${CONCEPT_COST} credit`}
          title={
            shortForRender
              ? NO_RENDER
              : "Describe a change to this image"
          }
          className={shortForRender ? OUTLINE_BUTTON_OFF : OUTLINE_BUTTON}
        >
          <Icon icon={MagicWand01Icon} />
          Refine
        </button>
        <button
          type="button"
          onClick={regenerating ? () => {} : onRegenerate}
          disabled={shortForRender}
          aria-disabled={regenerating || shortForRender}
          aria-pressed={regenerating}
          aria-label={`Regenerate a fresh take of ${name} — ${CONCEPT_COST} credit`}
          title={
            shortForRender
              ? NO_RENDER
              : regenerating
                ? "A fresh take is rendering"
                : "Fresh take — ignores the current image"
          }
          className={
            shortForRender
              ? OUTLINE_BUTTON_OFF
              : regenerating
                ? "inline-flex h-[36px] items-center gap-[8px] rounded-lg border border-solid border-border-strong bg-bg-subtle px-[12px] text-sm font-medium text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                : OUTLINE_BUTTON
          }
        >
          <Icon icon={Refresh01Icon} />
          Regenerate
        </button>
        <span className="text-sm text-text-tertiary">
          {CONCEPT_COST} credit each
        </span>
        {inBuild && !leftOut && <BuiltChip />}
        {leftOut && (
          <span className="ml-auto text-sm font-medium text-text-tertiary">
            Left out
          </span>
        )}
      </div>
    </article>
  );
}

/** "Include in build" for one product — a real checkbox, named for the
 *  product, so a screen reader hears which one it is ticking. */
function BuildTick({
  what,
  choice,
}: {
  what: string;
  choice: { included: boolean; locked?: boolean; onToggle?: () => void };
}) {
  const reason = choice.locked
    ? `${what} is always built — it is the concept this project started from`
    : undefined;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={choice.included}
      aria-disabled={choice.locked || undefined}
      aria-label={reason ?? `Include ${what} in the build`}
      title={reason ?? "Include in the build"}
      onClick={choice.locked ? undefined : choice.onToggle}
      className={[
        "inline-flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
        choice.locked ? "cursor-not-allowed" : "hover:bg-bg-subtle",
      ].join(" ")}
    >
      <Checkbox checked={choice.included} decorative disabled={choice.locked} />
    </button>
  );
}

/** Takes the product out of the project — undone from the canvas's own
 *  Removed list, free, since its concept is kept. */
function RemoveButton({ what, onRemove }: { what: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Remove ${what} from this project`}
      title="Remove from this project"
      className="inline-flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-md text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-subtle hover:text-text-error focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      <Icon icon={Delete02Icon} size={16} />
    </button>
  );
}

// ───────────────────── parts ─────────────────────

// This drawing is the one the build on this canvas was made from. The build
// itself is right there, so the chip names the fact rather than linking away
// to a page of its own.
function BuiltChip() {
  return (
    <span className="ml-auto inline-flex h-[28px] items-center gap-[6px] rounded-lg bg-bg-success-subtle px-[10px] text-sm font-medium text-text-success">
      <Icon icon={CheckmarkBadge01Icon} size={14} />
      In this build
    </span>
  );
}

// Shown once per thread while the balance can't cover a build — every
// ready card's CTA is off, and one notice explains all of them. The
// thread places it under the newest concept that could still be built
// (see chat-thread.tsx); per card it would repeat the same sentence
// down the whole conversation.
export function InsufficientCreditsBanner({ cost }: { cost: number }) {
  return (
    <aside
      role="note"
      data-testid="credits-banner"
      className="flex w-full max-w-[640px] items-start gap-[12px] rounded-2xl border border-[var(--color-border-warning)] bg-bg-warning-subtle p-[16px]"
    >
      <span className="mt-[2px] shrink-0 text-[var(--color-icon-warning)]">
        <Icon icon={Coins01Icon} size={20} />
      </span>
      <div className="flex min-w-0 flex-col gap-[4px]">
        <p className="text-md font-semibold text-text-primary">
          Not enough credits to build this
        </p>
        <p className="text-sm text-text-secondary">
          Building it costs {cost} credits — {BUILD_COST} per product — and
          each concept render costs {CONCEPT_COST}.
        </p>
        <Link
          href="/history#credits"
          className="w-fit text-sm font-semibold text-text-warning no-underline outline-none transition-opacity duration-fast hover:opacity-80 focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          Top up credits →
        </Link>
      </div>
    </aside>
  );
}

// The product is the title; the lineage number is metadata beside it. The
// number used to be the only name a card had, in a violet caps chip.
function ConceptHeader({
  conceptLabel,
  productName,
  ts,
  lead,
  trail,
}: {
  conceptLabel: string;
  productName?: string;
  ts?: number;
  /** The build tick, before the name. */
  lead?: React.ReactNode;
  /** The remove control, after the time. */
  trail?: React.ReactNode;
}) {
  // Re-read on the minute clock, so "just now" does not stay "just now".
  const now = useMinuteClock();
  const time = ts ? formatRelative(ts, now) : "";
  return (
    <header className="flex items-center justify-between gap-[12px]">
      <div className="flex min-w-0 items-baseline gap-[8px]">
        {lead && <span className="self-center">{lead}</span>}
        {productName && (
          <h3 className="truncate text-md font-semibold text-text-primary">
            {productName}
          </h3>
        )}
        <span className="shrink-0 text-sm text-text-tertiary">
          Concept {conceptLabel}
        </span>
      </div>
      {(time || trail) && (
        <span className="flex shrink-0 items-center gap-[4px]">
          {time && <span className="text-sm text-text-tertiary">{time}</span>}
          {trail}
        </span>
      )}
    </header>
  );
}

// The copy control on the prompt line. Writes the prompt itself (not the
// "Prompt:" label), and says "Copied" for a beat so the click has an
// answer — a silent icon leaves the user guessing whether it fired.
function CopyPromptButton({ prompt }: { prompt: string }) {
  const [copied, setCopied] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!navigator.clipboard) {
      setFailed(true);
      timer.current = setTimeout(() => setFailed(false), 1200);
      return;
    }
    navigator.clipboard
      .writeText(prompt)
      .then(() => {
        setFailed(false);
        setCopied(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 1200);
      })
      .catch(() => {
        setFailed(true);
        timer.current = setTimeout(() => setFailed(false), 1200);
      });
  }, [prompt]);

  return (
    <button
      type="button"
      onClick={copy}
      data-testid="copy-prompt"
      aria-label={
        failed
          ? "Copy failed — select the text instead"
          : copied
            ? "Copied"
            : "Copy prompt"
      }
      title={
        failed
          ? "Copy failed — select the text instead"
          : copied
            ? "Copied"
            : "Copy prompt"
      }
      className="inline-flex h-[28px] shrink-0 items-center gap-[4px] rounded-lg px-[6px] text-sm font-medium text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-subtle hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      <Icon icon={copied ? Tick02Icon : Copy01Icon} size={15} />
      {copied && "Copied"}
    </button>
  );
}

// The wait has no card chrome — just the tile the image will fill, so the
// thread doesn't jump when the render lands.
function PendingImageTurn({
  conceptLabel,
  productName,
  since,
}: {
  conceptLabel: string;
  parentConceptLabel?: string;
  productName?: string;
  kind: "fresh" | "refine";
  since: number;
}) {
  // The real elapsed time, and what a render usually takes — not a
  // percentage the generator never reported.
  const now = useSecondClock(true);
  const what = productName ?? `concept ${conceptLabel}`;
  return (
    // Not a live region: the clock moves every second, and announcing each
    // tick is noise. The rail beside the canvas reports when it lands.
    <div
      role="img"
      aria-label={`Drawing ${what}`}
      className="relative flex aspect-[64/53] w-full max-w-[640px] flex-col items-center justify-center gap-[10px] overflow-hidden rounded-2xl border border-solid border-border bg-bg-subtle"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(var(--color-border) 1px, transparent 1px)",
          backgroundSize: "8px 8px",
        }}
      />
      <span
        data-testid="turn-progress"
        className="relative inline-flex items-center gap-[8px] rounded-full border border-solid border-border bg-bg-surface px-[16px] py-[8px] text-md font-medium tabular-nums text-text-secondary"
      >
        <span aria-hidden className="inline-flex motion-safe:animate-spin text-text-tertiary">
          <Icon icon={Refresh01Icon} size={14} />
        </span>
        Drawing {what} · {elapsedLabel(since, now)}
      </span>
      <span className="relative text-sm text-text-tertiary">
        Usually 30–60 seconds
      </span>
    </div>
  );
}

// What went wrong, in the words that tell the reader what to do about it.
// A provider that will not render until its account is topped up cannot be
// retried into working, and saying "try again" there wastes the user's
// time on a loop that has one answer — so that case says so and offers the
// retry as the long shot it is, not as the fix.
const FAIL_COPY: Record<NonNullable<ConceptFailReason>, string> = {
  "provider-credit":
    "The image service turned the render down — the account it bills has run out of credit. Trying again won't help until it's topped up. Nothing was charged; your credit balance is unchanged.",
  busy: "The image service was busy and didn't finish in time. Nothing was charged — your credit balance is unchanged.",
  unreachable:
    "Couldn't reach the image service at all. Nothing was charged — your credit balance is unchanged.",
  storage:
    "The image was generated, but we couldn't store it, so there is nothing to show. That is a fault on our side, not yours — nothing was charged.",
  "parent-lost":
    "The concept this was refining is no longer stored, so there was nothing to evolve. Nothing was charged — start a fresh concept instead.",
  credits:
    "Your credit balance ran out before this render started. Nothing was charged.",
  filtered:
    "The image service's safety filter blocked this render by mistake, so there is no picture. Nothing was charged — trying again usually works.",
};

const FAIL_FALLBACK =
  "The request didn't reach the model. Nothing was charged — your credit balance is unchanged.";

function FailedImageTurn({
  reason,
  onRetry,
  disabled,
}: {
  reason?: ConceptFailReason;
  onRetry: () => void;
  /** A retry is a fresh render, so it costs one like any other. */
  disabled?: boolean;
}) {
  return (
    <div
      role="alert"
      className="flex w-full max-w-[640px] gap-[12px] rounded-2xl border border-border bg-bg-surface p-[20px]"
    >
      <span className="mt-[2px] inline-flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-bg-error-subtle text-[var(--color-icon-error)]">
        <Icon icon={Alert02Icon} size={16} />
      </span>
      <div className="flex min-w-0 flex-col gap-[6px]">
        <p className="text-md font-semibold text-text-primary">
          Couldn&apos;t draft that concept
        </p>
        <p className="text-sm leading-relaxed text-text-tertiary">
          {reason ? FAIL_COPY[reason] : FAIL_FALLBACK}
        </p>
        <button
          type="button"
          onClick={onRetry}
          disabled={disabled}
          title={disabled ? NO_RENDER : undefined}
          className={
            disabled
              ? "mt-[4px] inline-flex h-[36px] w-fit items-center gap-[8px] rounded-lg border border-solid border-border bg-bg-subtle px-[14px] text-sm font-semibold text-text-disabled outline-none"
              : "mt-[4px] inline-flex h-[36px] w-fit items-center gap-[8px] rounded-lg border border-solid border-border bg-bg-surface px-[14px] text-sm font-semibold text-text-primary outline-none transition-colors duration-fast hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus"
          }
        >
          <Icon icon={Refresh01Icon} />
          Try again
        </button>
      </div>
    </div>
  );
}

function formatRelative(ts: number, now: number): string {
  const delta = Math.max(0, now - ts);
  const sec = Math.floor(delta / 1000);
  if (sec < 45) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
