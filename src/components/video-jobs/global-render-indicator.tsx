"use client";

// GlobalRenderIndicator — a stack of dark toasts fixed top-centre, visible on
// every page once at least one video job wants attention (rendering, or done
// but not yet reviewed, or failed). One line per job, newest on top:
//   rendering → "Video rendering · ~Nm remaining. Project goes live when
//                done." + CANCEL + ×
//   ready     → "Video ready · <title>. Tap to review." + REVIEW (opens
//                ReviewModal) + ×
//   failed    → "Video render failed · <title>." + RETRY + ×
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
              alignItems: "center",
              gap: 8,
              pointerEvents: "auto",
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
                from { opacity: 0; transform: translateY(-6px); }
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

  let badgeBg: string;
  let accent: string;
  let icon: React.ReactNode;
  let message: React.ReactNode;
  let action: React.ReactNode;

  if (isDone) {
    badgeBg = "var(--color-green-500)";
    accent = "var(--color-green-400)";
    icon = <CheckGlyph />;
    message = (
      <>
        Video ready · {title}. Tap to review.
      </>
    );
    action = (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onReview();
        }}
        style={actionButtonStyle(accent)}
      >
        REVIEW
      </button>
    );
  } else if (isFailed) {
    badgeBg = "var(--color-red-500)";
    accent = "var(--color-red-400)";
    icon = <AlertGlyph />;
    message = <>Video render failed · {title}.</>;
    action = (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRetry();
        }}
        style={actionButtonStyle(accent)}
      >
        RETRY
      </button>
    );
  } else {
    badgeBg = "var(--color-blue-500)";
    accent = "var(--color-blue-400)";
    icon = <InfoGlyph />;
    message = (
      <>
        Video rendering · ~{fmtMin(etaSec)} remaining. Project goes live when
        done.
      </>
    );
    action = (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onCancel();
        }}
        style={actionButtonStyle(accent)}
      >
        CANCEL
      </button>
    );
  }

  return (
    <div
      className="ix-render-toast"
      onClick={isDone ? onReview : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "min(92vw, 420px)",
        padding: "10px 10px 10px 14px",
        background: "var(--color-bg-toast)",
        color: "var(--color-text-on-toast)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--elevation-5)",
        fontSize: "var(--font-size-sm)",
        lineHeight: 1.35,
        cursor: isDone ? "pointer" : "default",
      }}
    >
      <span
        style={{
          flex: "0 0 20px",
          width: 20,
          height: 20,
          borderRadius: 10,
          background: badgeBg,
          color: "var(--color-white)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>{message}</span>
      {action}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        aria-label="Dismiss"
        style={dismissButtonStyle}
      >
        ×
      </button>
    </div>
  );
}

function InfoGlyph() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="7" r="2" />
      <rect x="10.4" y="11" width="3.2" height="9.5" rx="1.4" />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 13l4 4 10-10" />
    </svg>
  );
}

function AlertGlyph() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
      <rect x="10.4" y="3" width="3.2" height="12" rx="1.4" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  );
}

function actionButtonStyle(accent: string): React.CSSProperties {
  return {
    flex: "0 0 auto",
    padding: "4px 6px",
    margin: 0,
    background: "transparent",
    border: "none",
    borderRadius: "var(--radius-sm)",
    color: accent,
    fontSize: "var(--font-size-xs)",
    fontWeight: 700,
    letterSpacing: "0.02em",
    whiteSpace: "nowrap",
    cursor: "pointer",
  };
}

const dismissButtonStyle: React.CSSProperties = {
  flex: "0 0 auto",
  padding: "2px 4px",
  margin: 0,
  background: "transparent",
  border: "none",
  color: "var(--color-gray-400)",
  fontSize: 16,
  lineHeight: 1,
  cursor: "pointer",
};
