"use client";

// GlobalRenderIndicator — a stack of toasts in the bottom-right corner, visible
// on every page once at least one video job wants attention (rendering, or done
// but not yet reviewed, or failed). One card per job, newest on top, in the
// attention toast's own shape:
//   rendering → "Video rendering · about Nm left" / <title> + Cancel + ×
//   ready     → "Video ready" / <title> + Review (opens ReviewModal) + ×
//   failed    → "Video render failed" / <title> + Try again + ×
//
// Email/browser notification opt-ins live in Step 2's own render card
// (components/brief/step-2-video.tsx) — this indicator is a status line, not
// a second copy of that UI.

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  useVideoJobs,
  progressOf,
  type VideoJob,
} from "./video-jobs-provider";
import { ReviewModal } from "@/components/brief/review-modal";
import { RegenerateConfirm } from "@/components/brief/regenerate-confirm";
import { RegenerateFlow } from "./regenerate-flow";
import { useManualProjects, stepHref } from "@/lib/manual/projects";

// Cross-page handoff: when the user picks "Regenerate" from the indicator, we
// stash a snapshot of the old job's prompt/quality/title here and send the user
// back to /brief Step 2. The brief picks it up, restores the prompt for edit,
// clears the storyboard, and lets the user re-generate from scratch — matching
// the original brief flow exactly.
const REGEN_REQUEST_KEY = "ideeza:brief:regenerate";
const REGEN_EVENT = "ideeza:brief-regenerate";

function fmtMin(seconds: number): string {
  if (seconds <= 0) return "<1m";
  const min = Math.ceil(seconds / 60);
  return `${min}m`;
}

export function GlobalRenderIndicator() {
  const { jobs, hydrated, acknowledge, dismiss } = useVideoJobs();
  const router = useRouter();
  const { activeProject } = useManualProjects();
  const [reviewingId, setReviewingId] = React.useState<string | null>(null);
  const [regenConfirmFor, setRegenConfirmFor] = React.useState<string | null>(
    null,
  );
  // Snapshot the job at open-time so dismissing it inside the modal doesn't
  // collapse the modal's UI mid-flow.
  const [regenFlowJob, setRegenFlowJob] = React.useState<VideoJob | null>(
    null,
  );

  // The shared toast layer's "render" slot (src/app/layout.tsx) — queried
  // after mount so this never touches `document` during SSR; the portal is
  // skipped until it's found. Keeps this stack from painting over the build
  // attention banner, which lives in the same layer's "attention" slot.
  const [renderSlot, setRenderSlot] = React.useState<HTMLElement | null>(
    null,
  );
  React.useEffect(() => {
    setRenderSlot(document.getElementById("ideeza-toast-layer-render"));
  }, []);

  // Regenerate has two paths based on whether the job has been minted:
  //  • !minted (still inside the brief flow): snapshot prompt + quality, drop
  //    the job, and send the user back to /brief Step 2 so they can edit the
  //    prompt, re-create the storyboard, and continue into the mint step.
  //  • minted (brief already done): open the in-place RegenerateFlow modal —
  //    same prompt → storyboard → render UI, but no "Continue to mint setup"
  //    since the listing is already minted. The modal handles the swap and
  //    the new job inherits the minted flag.
  const handleRegenerate = (jobId: string) => {
    const j = jobs.find((x) => x.id === jobId);
    if (!j) return;
    if (j.minted) {
      setRegenFlowJob(j);
      return;
    }
    try {
      window.localStorage.setItem(
        REGEN_REQUEST_KEY,
        JSON.stringify({
          title: j.title,
          prompt: j.prompt,
          quality: j.quality,
        }),
      );
    } catch {}
    dismiss(jobId);
    try {
      window.dispatchEvent(new CustomEvent(REGEN_EVENT));
    } catch {}
    router.push(activeProject ? stepHref(activeProject, "brief") : "/brief");
  };

  if (!hydrated) return null;
  // Only surface jobs that still want the user's attention: anything rendering,
  // and any completed job the user hasn't yet reviewed.
  const visible = jobs.filter(
    (j) =>
      (j.stage !== "done" && j.stage !== "failed") ||
      (j.stage === "done" && !j.acknowledged) ||
      j.stage === "failed",
  );
  if (visible.length === 0) return null;

  // Newest job on top.
  const stacked = [...visible].reverse();

  const reviewingJob = reviewingId
    ? jobs.find((j) => j.id === reviewingId) || null
    : null;

  return (
    <>
      {renderSlot &&
        createPortal(
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 8,
            }}
            role="status"
            aria-live="polite"
            aria-label="Video render status"
          >
            {stacked.map((j) => (
              <ToastLine
                key={j.id}
                job={j}
                onReview={() => setReviewingId(j.id)}
                onCancel={() => dismiss(j.id)}
                onRetry={() => setRegenConfirmFor(j.id)}
                onDismiss={() => dismiss(j.id)}
              />
            ))}

            <style>{`
              @keyframes ix-render-toast-in {
                from { opacity: 0; transform: translateY(6px); }
                to   { opacity: 1; transform: translateY(0); }
              }
              .ix-render-toast { animation: ix-render-toast-in .2s var(--motion-easing-decelerate); }
              @media (prefers-reduced-motion: reduce) {
                .ix-render-toast { animation: none; }
              }
            `}</style>
          </div>,
          renderSlot,
        )}

      {reviewingJob && (
        <ReviewModal
          open={true}
          variant="approve"
          prompt={reviewingJob.prompt}
          quality={reviewingJob.quality}
          onApprove={() => acknowledge(reviewingJob.id)}
          onRegenerate={() => {
            setReviewingId(null);
            setRegenConfirmFor(reviewingJob.id);
          }}
          onClose={() => setReviewingId(null)}
        />
      )}

      <RegenerateConfirm
        open={regenConfirmFor !== null}
        onCancel={() => setRegenConfirmFor(null)}
        onConfirm={() => {
          const id = regenConfirmFor;
          setRegenConfirmFor(null);
          if (id) handleRegenerate(id);
        }}
      />

      <RegenerateFlow
        open={regenFlowJob !== null}
        baseJob={regenFlowJob}
        onClose={() => setRegenFlowJob(null)}
      />
    </>
  );
}

function ToastLine({
  job,
  onReview,
  onCancel,
  onRetry,
  onDismiss,
}: {
  job: VideoJob;
  onReview: () => void;
  onCancel: () => void;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  const isDone = job.stage === "done";
  const isFailed = job.stage === "failed";
  const { etaSec } = progressOf(job);
  const title = job.title || "Untitled video";

  // The attention toast's shape, so the app has one: a surface card, a tinted
  // tile carrying the state, the state in words, one action in the card's own
  // button style. It used to be an inverted dark strip with uppercase coloured
  // text links — a second toast language beside the first.
  const tone = isDone ? "success" : isFailed ? "error" : "info";
  const kicker = isDone
    ? "Video ready"
    : isFailed
      ? "Video render failed"
      : `Video rendering · about ${fmtMin(etaSec)} left`;
  const action = isDone
    ? { label: "Review", run: onReview }
    : isFailed
      ? { label: "Try again", run: onRetry }
      : { label: "Cancel", run: onCancel };

  return (
    <div
      className={[
        "ix-render-toast pointer-events-auto flex w-[400px] max-w-[calc(100vw-32px)] items-center gap-[12px] rounded-2xl border bg-bg-surface px-[14px] py-[10px] shadow-3",
        tone === "error"
          ? "border-[var(--color-border-error)]"
          : tone === "success"
            ? "border-[var(--color-border-success)]"
            : "border-border",
      ].join(" ")}
    >
      <span
        aria-hidden
        className={[
          "inline-flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-lg",
          tone === "error"
            ? "bg-bg-error-subtle text-text-error"
            : tone === "success"
              ? "bg-bg-success-subtle text-text-success"
              : "bg-bg-subtle text-text-secondary",
        ].join(" ")}
      >
        {isDone ? <CheckGlyph /> : isFailed ? <AlertGlyph /> : <InfoGlyph />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-text-tertiary">{kicker}</p>
        <p className="truncate text-md font-semibold text-text-primary">{title}</p>
      </div>
      <button
        type="button"
        onClick={action.run}
        className="inline-flex h-[32px] shrink-0 items-center rounded-lg border border-solid border-border bg-bg-surface px-[12px] text-sm font-semibold text-text-primary outline-none transition-colors duration-fast hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        {action.label}
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="inline-flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-lg text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-surface-raised hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}

function InfoGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="7" r="2" />
      <rect x="10.4" y="11" width="3.2" height="9.5" rx="1.4" />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 13l4 4 10-10" />
    </svg>
  );
}

function AlertGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <rect x="10.4" y="3" width="3.2" height="12" rx="1.4" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  );
}
