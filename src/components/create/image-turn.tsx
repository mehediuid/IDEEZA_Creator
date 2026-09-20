"use client";

// ImageTurn — assistant turn in the concept chat. Either:
//   • Pending  — a bare rendering tile: dotted texture + a centred
//                "Rendering concept N · P%" pill, no card chrome
//   • Ready    — header (chip + time), image, the prompt on one line
//                with a copy button, then the action row
//   • Failed   — error card with a retry control
//
// Spec §4b: regenerate is a FRESH from-scratch take; refinement comes
// from typing a change into the persistent prompt bar (handled by the
// orchestrator). Use this works on ANY image in the thread, not just
// the latest.
//
// Spec §4c: each card shows a "Concept N" label so users can locate
// versions while scrolling. Lineage is carried by that dotted label
// ("1.2" is the second refine of concept 1) — no breadcrumb row.
//
// Styling: Refine and Regenerate are outlined, "Use this concept" is
// the one primary violet CTA on the card.
//
// Two states replace that action row. When the balance can't cover a
// build the price line names the shortfall and the CTA is off (the
// thread carries one InsufficientCreditsBanner saying why). Once the
// concept has been sent to build the row becomes the build's own
// status line — see SentToBuildRow.

import * as React from "react";
import Link from "next/link";
import {
  Alert02Icon,
  ArrowRight01Icon,
  CheckmarkBadge01Icon,
  Coins01Icon,
  Copy01Icon,
  InformationCircleIcon,
  MagicWand01Icon,
  Refresh01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { BUILD_COST, CONCEPT_COST, useCredits } from "@/lib/create/credits";
import {
  minutesLeft,
  statusOf,
  useCreateHistory,
  type BuildJob,
  type ChatTurn,
  type ConceptFailReason,
} from "@/lib/create/history";
import { useMinuteClock } from "./build-status";

const COST_HINT = `Generating the full product uses ${BUILD_COST} credits. Every concept render — a first draft, a refine or a regenerate — uses ${CONCEPT_COST}.`;
/** Said on both concept controls when the balance cannot cover a render. */
const NO_RENDER = `Not enough credits — a concept render costs ${CONCEPT_COST}`;

const OUTLINE_BUTTON =
  "inline-flex h-[36px] items-center gap-[8px] rounded-lg border border-solid border-border bg-bg-surface px-[12px] text-sm font-medium text-text-secondary outline-none transition-colors duration-fast hover:border-border-strong hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus";

export function ImageTurn({
  turn,
  conceptLabel,
  parentConceptLabel,
  regenerating = false,
  preparing = false,
  onRegenerate,
  onUseThis,
  onRefine,
}: {
  turn: Extract<ChatTurn, { role: "assistant" }>;
  conceptLabel: string;
  parentConceptLabel?: string;
  regenerating?: boolean;
  /** Pressing Use this concept reads the concept back and asks whether it
   *  is part of a multi-product system — two model round-trips before the
   *  gate can open. The button says so rather than looking ignored. */
  preparing?: boolean;
  onRegenerate: () => void;
  onUseThis: () => void;
  onRefine: () => void;
}) {
  const [imgOk, setImgOk] = React.useState(true);
  // The rendered balance, not canAfford(): that reads a ref the provider
  // refreshes in its OWN effect, and a provider's effects run after its
  // children's — so from here the ref is a render behind (the build
  // simulator reads the balance the same way, for the same reason).
  // Before the ledger has read storage its balance is 0, so the gate
  // waits for `hydrated` rather than greying every card on load.
  const { hydrated: creditsHydrated, balance } = useCredits();
  const shortOnCredits = creditsHydrated && balance < BUILD_COST;
  // A render is far cheaper than a build, so the two gates are separate:
  // a balance of 2 still refines, it just cannot start a build yet.
  const shortForRender = creditsHydrated && balance < CONCEPT_COST;
  const costHintId = React.useId();

  if (turn.status === "pending") {
    return (
      <PendingImageTurn
        conceptLabel={conceptLabel}
        parentConceptLabel={parentConceptLabel}
        kind={turn.kind}
        progress={turn.progress}
      />
    );
  }
  if (turn.status === "failed") {
    return (
      <FailedImageTurn
        reason={turn.failReason}
        onRetry={onRegenerate}
        disabled={shortForRender}
      />
    );
  }

  // status === "ready"
  return (
    <article
      aria-label={`Concept ${conceptLabel}`}
      className="flex w-full max-w-[640px] flex-col gap-[12px] rounded-2xl border border-border bg-bg-surface p-[16px]"
    >
      <ConceptHeader conceptLabel={conceptLabel} ts={turn.ts} />

      {turn.imageUrl && imgOk ? (
        <button
          type="button"
          onClick={onRefine}
          disabled={shortForRender}
          aria-label={
            shortForRender
              ? `Concept ${conceptLabel} — ${NO_RENDER.toLowerCase()}`
              : `Refine Concept ${conceptLabel} — open the image editor`
          }
          title={shortForRender ? NO_RENDER : undefined}
          className="block w-full overflow-hidden rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={turn.imageUrl}
            alt={`Concept ${conceptLabel} ${turn.kind === "refine" ? "refining Concept " + parentConceptLabel : "from"}: ${turn.prompt}`}
            onError={() => setImgOk(false)}
            className="aspect-[16/10] w-full object-cover"
          />
        </button>
      ) : turn.imageUrl ? (
        <div className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-[8px] rounded-xl bg-bg-surface-raised px-[16px] text-center">
          <p className="text-sm text-text-tertiary">
            Couldn&apos;t load this image.
          </p>
          <button
            type="button"
            onClick={onRegenerate}
            disabled={shortForRender}
            title={shortForRender ? NO_RENDER : undefined}
            className={
              shortForRender
                ? "inline-flex h-[36px] items-center gap-[8px] rounded-lg border border-solid border-border bg-bg-subtle px-[12px] text-sm font-medium text-text-disabled outline-none"
                : OUTLINE_BUTTON
            }
          >
            <Icon icon={Refresh01Icon} />
            Regenerate
          </button>
        </div>
      ) : null}

      <div className="flex items-center gap-[8px]">
        {/* Truncated while the card is still a choice — the row has to
            leave space for three controls. Once the concept is building
            the row is a status line, so the prompt it was sent with is
            shown whole. */}
        <p
          className={
            turn.usedForBuild
              ? "min-w-0 flex-1 text-sm text-text-tertiary"
              : "min-w-0 flex-1 truncate text-sm text-text-tertiary"
          }
        >
          <span className="font-semibold text-text-secondary">Prompt: </span>
          {turn.prompt}
        </p>
        <CopyPromptButton prompt={turn.prompt} />
      </div>

      <div aria-hidden className="h-px w-full bg-border" />

      <div className="flex flex-wrap items-center gap-[8px]">
        {turn.usedForBuild ? (
          <SentToBuildRow buildId={turn.usedForBuild} />
        ) : (
          <>
            <button
              type="button"
              onClick={onRefine}
              disabled={shortForRender}
              aria-label={`Refine Concept ${conceptLabel} in the editor`}
              title={
                shortForRender
                  ? NO_RENDER
                  : "Open the editor — describe edits to this image"
              }
              className={shortForRender ? "inline-flex h-[36px] items-center gap-[8px] rounded-lg border border-solid border-border bg-bg-subtle px-[12px] text-sm font-medium text-text-disabled outline-none" : OUTLINE_BUTTON}
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
              aria-label={`Regenerate a fresh take of Concept ${conceptLabel}`}
              title={
                shortForRender
                  ? NO_RENDER
                  : regenerating
                    ? "A fresh take is rendering below"
                    : "Fresh take — ignores the current image"
              }
              className={
                shortForRender
                  ? "inline-flex h-[36px] items-center gap-[8px] rounded-lg border border-solid border-border bg-bg-subtle px-[12px] text-sm font-medium text-text-disabled outline-none"
                  : regenerating
                    ? "inline-flex h-[36px] items-center gap-[8px] rounded-lg border border-solid border-border-strong bg-bg-subtle px-[12px] text-sm font-medium text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    : OUTLINE_BUTTON
              }
            >
              <Icon icon={Refresh01Icon} />
              Regenerate
            </button>
            {/* When the balance can't cover a build the price line says
                what the balance IS — the gap is the reason the CTA is
                off, and naming it here saves a trip to the ledger. */}
            <span
              data-testid="cost-label"
              className={
                shortOnCredits
                  ? "inline-flex items-center gap-[4px] text-sm text-text-error"
                  : "inline-flex items-center gap-[4px] text-sm text-text-tertiary"
              }
            >
              Cost: {BUILD_COST} credits
              {shortOnCredits ? ` · you have ${balance}` : ""}
              <button
                type="button"
                aria-label={COST_HINT}
                title={COST_HINT}
                aria-describedby={costHintId}
                className="inline-flex h-[20px] w-[20px] items-center justify-center rounded-full outline-none transition-colors duration-fast hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                <Icon icon={InformationCircleIcon} size={14} />
              </button>
              <span id={costHintId} className="sr-only">
                {COST_HINT}
              </span>
            </span>
            <button
              type="button"
              onClick={onUseThis}
              disabled={shortOnCredits || preparing}
              aria-disabled={shortOnCredits || preparing}
              aria-busy={preparing}
              aria-label={`Use Concept ${conceptLabel} and start the full build`}
              title={
                shortOnCredits
                  ? "Not enough credits"
                  : preparing
                    ? "Reading the concept back…"
                    : undefined
              }
              className={
                shortOnCredits
                  ? "ml-auto inline-flex h-[36px] cursor-not-allowed items-center gap-[8px] rounded-lg bg-bg-subtle px-[14px] text-sm font-semibold text-text-disabled"
                  : preparing
                    ? "ml-auto inline-flex h-[36px] cursor-wait items-center gap-[8px] rounded-lg bg-violet-600 px-[14px] text-sm font-semibold text-text-on-brand opacity-80"
                    : "ml-auto inline-flex h-[36px] items-center gap-[8px] rounded-lg bg-violet-600 px-[14px] text-sm font-semibold text-text-on-brand outline-none transition-colors duration-fast hover:bg-violet-500 focus-visible:ring-2 focus-visible:ring-border-focus"
              }
            >
              {preparing ? (
                <>
                  <span
                    aria-hidden
                    className="inline-flex motion-safe:animate-spin"
                  >
                    <Icon icon={Refresh01Icon} size={14} />
                  </span>
                  Preparing…
                </>
              ) : (
                <>
                  Use this concept
                  {!shortOnCredits && <Icon icon={ArrowRight01Icon} />}
                </>
              )}
            </button>
          </>
        )}
      </div>
    </article>
  );
}

// ───────────────────── parts ─────────────────────

function SentChip() {
  return (
    <span className="inline-flex h-[36px] items-center gap-[6px] rounded-lg bg-bg-success-subtle px-[12px] text-2xs font-bold uppercase tracking-wider text-text-success">
      <Icon icon={CheckmarkBadge01Icon} size={14} />
      Sent to build
    </span>
  );
}

// The action row of a concept that has been sent to build: the chip says
// it left the chat, the line beside it says where the build has got to,
// and the link is the way back to it. The status is read from the job
// itself (never stored on the turn), so it is whatever the build really
// is right now — the simulator writes progress into the store every
// tick, which is what moves the "minutes left" figure here.
function SentToBuildRow({ buildId }: { buildId: string }) {
  const { getBuild } = useCreateHistory();
  // The same minute clock the build page reads — the countdown is in
  // whole minutes, so it is re-read on a slow tick rather than at
  // render, where Date.now() has no business.
  const now = useMinuteClock();
  const job = getBuild(buildId);

  // A chat kept from an earlier session can name a build this browser no
  // longer holds. The turn is still sent — there is just nothing to open.
  if (!job) return <SentChip />;

  return (
    <>
      <SentChip />
      <span
        data-testid="build-status-line"
        className="min-w-0 text-sm text-text-tertiary"
      >
        {buildStatusLine(job, now)}
      </span>
      <Link
        href={`/build/${job.id}`}
        aria-label="View this build"
        className={`ml-auto ${OUTLINE_BUTTON}`}
      >
        View build
        <Icon icon={ArrowRight01Icon} />
      </Link>
    </>
  );
}

// One sentence per build state: what it is doing, then what that means
// for the user.
// The stored `status` only speaks for the two states the items can't
// express (queued, and a system failure) — everything else is derived
// from the artifacts themselves, so the line reads statusOf(job).
function buildStatusLine(job: BuildJob, now: number): string {
  switch (statusOf(job)) {
    case "queued":
      return job.blocked === "credits"
        ? "Paused · top up credits to start"
        : "Queued · starts when the current build finishes";
    case "running":
      return `Building now · about ${minutesLeft(job, now)} minutes left`;
    case "ready":
      return "Build ready · review your deliverables";
    case "partial":
      return "Needs a retry · open the build";
    case "failed":
      return "Build failed · open the build";
  }
}

// Shown once per thread while the balance can't cover a build — every
// ready card's CTA is off, and one notice explains all of them. The
// thread places it under the newest concept that could still be built
// (see chat-thread.tsx); per card it would repeat the same sentence
// down the whole conversation.
export function InsufficientCreditsBanner() {
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
          Generating the full product costs {BUILD_COST} credits, and each
          concept render costs {CONCEPT_COST}.
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

function ConceptHeader({
  conceptLabel,
  ts,
}: {
  conceptLabel: string;
  ts?: number;
}) {
  const time = ts ? formatRelative(ts) : "";
  return (
    <header className="flex items-center justify-between gap-[12px]">
      <span className="inline-flex h-[22px] items-center rounded-full bg-bg-brand-subtle px-[8px] text-2xs font-bold uppercase tracking-wider text-text-brand">
        Concept {conceptLabel}
      </span>
      {time && (
        <span className="shrink-0 text-2xs font-medium text-text-tertiary">
          {time}
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
      className="inline-flex h-[28px] shrink-0 items-center gap-[4px] rounded-lg px-[6px] text-2xs font-medium text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-subtle hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-border-focus"
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
  parentConceptLabel,
  kind,
  progress,
}: {
  conceptLabel: string;
  parentConceptLabel?: string;
  kind: "fresh" | "refine";
  progress?: number;
}) {
  const pct = typeof progress === "number" ? Math.round(progress) : 0;
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={
        kind === "refine"
          ? `Refining Concept ${parentConceptLabel} into Concept ${conceptLabel}`
          : `Drafting Concept ${conceptLabel}`
      }
      className="relative flex aspect-[64/53] w-full max-w-[640px] items-center justify-center overflow-hidden rounded-2xl border border-solid border-[var(--color-glass-fill-brand)] bg-bg-brand-subtle"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(var(--color-glass-fill-brand) 1px, transparent 1px)",
          backgroundSize: "8px 8px",
        }}
      />
      <span
        data-testid="turn-progress"
        className="relative inline-flex items-center rounded-full border border-solid border-border bg-bg-surface px-[16px] py-[8px] text-md font-medium tabular-nums text-text-secondary"
      >
        Rendering concept {conceptLabel} · {pct}%
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
  credits:
    "Your credit balance ran out before this render started. Nothing was charged.",
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

function formatRelative(ts: number): string {
  const delta = Math.max(0, Date.now() - ts);
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
