"use client";

// ImageTurn — assistant turn in the concept chat. Either:
//   • Pending  — skeleton with a shimmer + "Drafting concept…" label
//   • Ready    — the image + per-image actions (Regenerate, Use this)
//   • Failed   — error state with a retry control
//
// Spec §4b: regenerate is a FRESH from-scratch take; refinement comes
// from typing a change into the persistent prompt bar (handled by the
// orchestrator). Use this works on ANY image in the thread, not just
// the latest.
//
// Spec §4c: each card shows a "Concept N" label so users can locate
// versions while scrolling. Refines also show a small "Refines Concept
// M" breadcrumb so the chain is visible.
//
// Styling: Regenerate is the secondary/ghost button, Use this is the
// primary violet CTA — per spec §4c.

import * as React from "react";
import {
  ArrowRight01Icon,
  CheckmarkBadge01Icon,
  Link01Icon,
  MagicWand01Icon,
  Refresh01Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import type { ChatTurn } from "@/lib/create/history";

export function ImageTurn({
  turn,
  conceptNumber,
  parentConceptNumber,
  onRegenerate,
  onUseThis,
  onRefine,
}: {
  turn: Extract<ChatTurn, { role: "assistant" }>;
  conceptNumber: number;
  parentConceptNumber?: number;
  onRegenerate: () => void;
  onUseThis: () => void;
  onRefine: () => void;
}) {
  const [imgOk, setImgOk] = React.useState(true);

  if (turn.status === "pending") {
    return (
      <PendingImageTurn
        conceptNumber={conceptNumber}
        parentConceptNumber={parentConceptNumber}
        kind={turn.kind}
      />
    );
  }
  if (turn.status === "failed") {
    return <FailedImageTurn onRetry={onRegenerate} />;
  }

  // status === "ready"
  return (
    <article
      aria-label={`Concept ${conceptNumber}`}
      className="flex max-w-[640px] flex-col gap-[12px] rounded-2xl border border-border bg-bg-surface p-[16px]"
    >
      <ConceptHeader
        conceptNumber={conceptNumber}
        parentConceptNumber={parentConceptNumber}
        kind={turn.kind}
        ts={turn.ts}
      />

      {turn.imageUrl && imgOk ? (
        <button
          type="button"
          onClick={onRefine}
          aria-label={`Refine Concept ${conceptNumber} — open the image editor`}
          className="group/img relative block w-full overflow-hidden rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={turn.imageUrl}
            alt={`Concept ${conceptNumber} ${turn.kind === "refine" ? "refining Concept " + parentConceptNumber : "from"}: ${turn.prompt}`}
            onError={() => setImgOk(false)}
            className="aspect-[4/3] w-full object-cover transition-transform duration-normal ease-standard group-hover/img:scale-[1.01]"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/55 to-transparent pb-[10px] pt-[28px] opacity-0 transition-opacity duration-fast group-hover/img:opacity-100 group-focus-visible/img:opacity-100 motion-reduce:transition-none"
          >
            <span className="inline-flex items-center gap-[6px] rounded-full bg-black/55 px-[12px] py-[6px] text-2xs font-semibold text-white">
              <Icon icon={MagicWand01Icon} size={13} />
              Click to refine
            </span>
          </span>
        </button>
      ) : turn.imageUrl ? (
        <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-[8px] rounded-xl bg-bg-surface-raised px-[16px] text-center">
          <p className="text-sm text-text-tertiary">
            Couldn&apos;t load this image.
          </p>
          <button
            type="button"
            onClick={onRegenerate}
            className="inline-flex h-[32px] items-center gap-[6px] rounded-lg border border-border bg-bg-surface px-[12px] text-sm font-medium text-text-secondary outline-none transition-colors duration-fast hover:border-border-strong hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <Icon icon={Refresh01Icon} />
            Regenerate
          </button>
        </div>
      ) : null}

      <p className="line-clamp-2 text-sm text-text-tertiary">
        <span className="font-semibold text-text-secondary">
          {turn.kind === "refine" ? "Change" : "Prompt"}:{" "}
        </span>
        {turn.prompt}
      </p>

      <div className="flex flex-wrap items-center justify-end gap-[8px]">
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
              aria-label={`Refine Concept ${conceptNumber} in the editor`}
              title="Open the editor — describe edits to this image"
              className="inline-flex h-[36px] items-center gap-[8px] rounded-lg border border-border bg-bg-surface px-[12px] text-sm font-medium text-text-secondary outline-none transition-colors duration-fast hover:border-border-strong hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              <Icon icon={MagicWand01Icon} />
              Refine
            </button>
            <button
              type="button"
              onClick={onRegenerate}
              aria-label={`Regenerate a fresh take of Concept ${conceptNumber}`}
              title="Fresh take — ignores the current image"
              className="inline-flex h-[36px] items-center gap-[8px] rounded-lg border border-border bg-bg-surface px-[12px] text-sm font-medium text-text-secondary outline-none transition-colors duration-fast hover:border-border-strong hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              <Icon icon={Refresh01Icon} />
              Regenerate
            </button>
            <button
              type="button"
              onClick={onUseThis}
              aria-label={`Use Concept ${conceptNumber} and start the full build`}
              className="inline-flex h-[36px] items-center gap-[8px] rounded-lg bg-violet-600 px-[14px] text-sm font-semibold text-text-on-brand outline-none transition-colors duration-fast hover:bg-violet-500 focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              Use this
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
  conceptNumber,
  parentConceptNumber,
  kind,
  ts,
}: {
  conceptNumber: number;
  parentConceptNumber?: number;
  kind: "fresh" | "refine";
  ts?: number;
}) {
  const time = ts ? formatRelative(ts) : "";
  return (
    <header className="flex items-center justify-between gap-[12px]">
      <div className="flex min-w-0 items-center gap-[8px]">
        <span className="inline-flex h-[22px] items-center rounded-full bg-bg-brand-subtle px-[8px] text-2xs font-bold uppercase tracking-wider text-text-brand">
          Concept {conceptNumber}
        </span>
        {kind === "refine" && parentConceptNumber && (
          <span className="inline-flex items-center gap-[6px] truncate text-2xs font-medium text-text-tertiary">
            <Icon icon={Link01Icon} size={12} />
            Refines Concept {parentConceptNumber}
          </span>
        )}
      </div>
      {time && (
        <span className="shrink-0 text-2xs font-medium text-text-tertiary">
          {time}
        </span>
      )}
    </header>
  );
}

function PendingImageTurn({
  conceptNumber,
  parentConceptNumber,
  kind,
}: {
  conceptNumber: number;
  parentConceptNumber?: number;
  kind: "fresh" | "refine";
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={
        kind === "refine"
          ? `Refining Concept ${parentConceptNumber} into Concept ${conceptNumber}`
          : `Drafting Concept ${conceptNumber}`
      }
      className="flex max-w-[640px] flex-col gap-[12px] rounded-2xl border border-border bg-bg-surface p-[16px]"
    >
      <ConceptHeader
        conceptNumber={conceptNumber}
        parentConceptNumber={parentConceptNumber}
        kind={kind}
      />
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-bg-surface-raised">
        <span
          aria-hidden
          className="ix-shimmer absolute inset-0 block"
          style={{
            background:
              "linear-gradient(110deg, transparent 25%, var(--color-bg-surface) 50%, transparent 75%)",
            backgroundSize: "200% 100%",
          }}
        />
      </div>
      <p className="text-sm text-text-tertiary">
        {kind === "refine" ? "Refining…" : "Drafting concept…"}
      </p>
      <style>{`
        @keyframes ix-shimmer-kf {
          from { background-position: 200% 0; }
          to   { background-position: -100% 0; }
        }
        .ix-shimmer { animation: ix-shimmer-kf 1.6s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .ix-shimmer { animation: none; }
        }
      `}</style>
    </div>
  );
}

function FailedImageTurn({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex max-w-[640px] flex-col gap-[12px] rounded-2xl border border-border bg-bg-surface p-[20px]"
    >
      <p className="text-md font-semibold text-text-primary">
        Couldn&apos;t draft that concept.
      </p>
      <p className="text-sm text-text-tertiary">
        The request didn&apos;t reach the model. You can try a fresh take
        from the same prompt.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex h-[36px] w-fit items-center gap-[8px] rounded-lg border border-border bg-bg-surface px-[14px] text-sm font-semibold text-text-primary outline-none transition-colors duration-fast hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <Icon icon={Refresh01Icon} />
        Try again
      </button>
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
