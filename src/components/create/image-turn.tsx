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

import * as React from "react";
import {
  Alert02Icon,
  ArrowRight01Icon,
  CheckmarkBadge01Icon,
  Copy01Icon,
  InformationCircleIcon,
  MagicWand01Icon,
  Refresh01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { BUILD_COST } from "@/lib/create/credits";
import type { ChatTurn } from "@/lib/create/history";

const COST_HINT = `Generating the full product uses ${BUILD_COST} credits. Refining stays free.`;

const OUTLINE_BUTTON =
  "inline-flex h-[36px] items-center gap-[8px] rounded-lg border border-border bg-bg-surface px-[12px] text-sm font-medium text-text-secondary outline-none transition-colors duration-fast hover:border-border-strong hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus";

export function ImageTurn({
  turn,
  conceptLabel,
  parentConceptLabel,
  regenerating = false,
  onRegenerate,
  onUseThis,
  onRefine,
}: {
  turn: Extract<ChatTurn, { role: "assistant" }>;
  conceptLabel: string;
  parentConceptLabel?: string;
  regenerating?: boolean;
  onRegenerate: () => void;
  onUseThis: () => void;
  onRefine: () => void;
}) {
  const [imgOk, setImgOk] = React.useState(true);

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
    return <FailedImageTurn onRetry={onRegenerate} />;
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
          aria-label={`Refine Concept ${conceptLabel} — open the image editor`}
          className="block w-full overflow-hidden rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={turn.imageUrl}
            alt={`Concept ${conceptLabel} ${turn.kind === "refine" ? "refining Concept " + parentConceptLabel : "from"}: ${turn.prompt}`}
            onError={() => setImgOk(false)}
            className="aspect-[4/3] w-full object-cover"
          />
        </button>
      ) : turn.imageUrl ? (
        <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-[8px] rounded-xl bg-bg-surface-raised px-[16px] text-center">
          <p className="text-sm text-text-tertiary">
            Couldn&apos;t load this image.
          </p>
          <button type="button" onClick={onRegenerate} className={OUTLINE_BUTTON}>
            <Icon icon={Refresh01Icon} />
            Regenerate
          </button>
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
        {turn.usedForBuild ? (
          <span className="inline-flex h-[36px] items-center gap-[6px] rounded-lg bg-bg-brand-subtle px-[12px] text-2xs font-bold uppercase tracking-wider text-text-brand">
            <Icon icon={CheckmarkBadge01Icon} size={14} />
            Sent to build
          </span>
        ) : (
          <>
            <button
              type="button"
              onClick={onRefine}
              aria-label={`Refine Concept ${conceptLabel} in the editor`}
              title="Open the editor — describe edits to this image"
              className={OUTLINE_BUTTON}
            >
              <Icon icon={MagicWand01Icon} />
              Refine
            </button>
            <button
              type="button"
              onClick={onRegenerate}
              disabled={regenerating}
              aria-pressed={regenerating}
              aria-label={`Regenerate a fresh take of Concept ${conceptLabel}`}
              title={
                regenerating
                  ? "A fresh take is rendering below"
                  : "Fresh take — ignores the current image"
              }
              className={
                regenerating
                  ? "inline-flex h-[36px] items-center gap-[8px] rounded-lg border border-border-brand bg-bg-brand-subtle px-[12px] text-sm font-medium text-text-brand outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  : OUTLINE_BUTTON
              }
            >
              <Icon icon={Refresh01Icon} />
              Regenerate
            </button>
            <span className="inline-flex items-center gap-[4px] text-sm text-text-tertiary">
              Cost: {BUILD_COST} credits
              <button
                type="button"
                aria-label={COST_HINT}
                title={COST_HINT}
                className="inline-flex h-[20px] w-[20px] items-center justify-center rounded-full text-text-tertiary outline-none transition-colors duration-fast hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                <Icon icon={InformationCircleIcon} size={14} />
              </button>
            </span>
            <button
              type="button"
              onClick={onUseThis}
              aria-label={`Use Concept ${conceptLabel} and start the full build`}
              className="ml-auto inline-flex h-[36px] items-center gap-[8px] rounded-lg bg-violet-600 px-[14px] text-sm font-semibold text-text-on-brand outline-none transition-colors duration-fast hover:bg-violet-500 focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              Use this concept
              <Icon icon={ArrowRight01Icon} />
            </button>
          </>
        )}
      </div>
    </article>
  );
}

// ───────────────────── parts ─────────────────────

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
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = React.useCallback(() => {
    void navigator.clipboard?.writeText(prompt)?.catch(() => null);
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1200);
  }, [prompt]);

  return (
    <button
      type="button"
      onClick={copy}
      data-testid="copy-prompt"
      aria-label={copied ? "Copied" : "Copy prompt"}
      title={copied ? "Copied" : "Copy prompt"}
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
      className="relative flex aspect-[64/53] w-full max-w-[640px] items-center justify-center overflow-hidden rounded-2xl border border-[var(--color-glass-fill-brand)] bg-bg-surface"
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
        className="relative inline-flex items-center rounded-full bg-[var(--color-glass-fill-md)] px-[16px] py-[8px] text-md font-medium tabular-nums text-text-secondary backdrop-blur-sm"
      >
        Rendering concept {conceptLabel} · {pct}%
      </span>
    </div>
  );
}

function FailedImageTurn({ onRetry }: { onRetry: () => void }) {
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
        <p className="text-sm text-text-tertiary">
          The request didn&apos;t reach the model. Nothing was charged — your
          credit balance is unchanged.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-[4px] inline-flex h-[36px] w-fit items-center gap-[8px] rounded-lg border border-border bg-bg-surface px-[14px] text-sm font-semibold text-text-primary outline-none transition-colors duration-fast hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus"
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
