"use client";

// GlobalRenderIndicator — fixed top-right chip visible on every page once at
// least one video job exists. Collapsed = small chip with count, ETA, or a
// green "ready" check. Expanded = a panel listing every active/ready job,
// each with progress, notification opt-ins, and review/regenerate actions.
//
// Clicking "Review" on a completed job opens the ReviewModal as a global
// overlay — so the user can approve / regenerate from any page.

import * as React from "react";
import { useRouter } from "next/navigation";
import { C } from "@/lib/pcb/colors";
import {
  useVideoJobs,
  progressOf,
  STAGE_LABELS,
  STAGE_ORDER,
  type VideoJob,
} from "./video-jobs-provider";
import { ReviewModal } from "@/components/brief/review-modal";
import { RegenerateConfirm } from "@/components/brief/regenerate-confirm";
import { RegenerateFlow } from "./regenerate-flow";

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
  const {
    jobs,
    hydrated,
    setEmailReminder,
    setBrowserNotify,
    acknowledge,
    dismiss,
  } = useVideoJobs();
  const router = useRouter();
  const [expanded, setExpanded] = React.useState(false);
  const [reviewingId, setReviewingId] = React.useState<string | null>(null);
  const [regenConfirmFor, setRegenConfirmFor] = React.useState<string | null>(
    null,
  );
  // Snapshot the job at open-time so dismissing it inside the modal doesn't
  // collapse the modal's UI mid-flow.
  const [regenFlowJob, setRegenFlowJob] = React.useState<VideoJob | null>(
    null,
  );

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
    router.push("/brief");
  };


  // Auto-open the indicator the first time a job finishes so the user notices.
  const prevDoneCount = React.useRef(0);
  const doneCount = jobs.filter(
    (j) => j.stage === "done" && !j.acknowledged,
  ).length;
  React.useEffect(() => {
    if (doneCount > prevDoneCount.current) setExpanded(true);
    prevDoneCount.current = doneCount;
  }, [doneCount]);

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

  const anyDone = visible.some((j) => j.stage === "done");
  const anyActive = visible.some(
    (j) => j.stage !== "done" && j.stage !== "failed",
  );
  const shortestEta = anyActive
    ? Math.min(
        ...visible
          .filter((j) => j.stage !== "done" && j.stage !== "failed")
          .map((j) => progressOf(j).etaSec),
      )
    : 0;

  const reviewingJob = reviewingId
    ? jobs.find((j) => j.id === reviewingId) || null
    : null;

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 50,
          width: expanded ? 360 : "auto",
          background: "var(--color-bg-surface)",
          border: `var(--border-width-1-5) solid ${
            anyDone
              ? "var(--color-green-500)"
              : "var(--color-border-brand)"
          }`,
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 12px 40px -10px rgba(0,0,0,.22)",
          overflow: "hidden",
          transition: "width .2s ease-out, border-color .3s",
        }}
        role="status"
        aria-live="polite"
        aria-label="Video render status"
      >
        {/* Chip header (always visible) */}
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            width: "100%",
            padding: "10px 14px",
            background: "transparent",
            border: "none",
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
            textAlign: "left",
          }}
          aria-expanded={expanded}
        >
          {anyDone ? (
            <span
              style={iconBadge(
                "var(--color-green-100)",
                "var(--color-green-700)",
              )}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 13l4 4 10-10" />
              </svg>
            </span>
          ) : (
            <span
              style={iconBadge(
                "var(--color-bg-brand-subtle)",
                "var(--color-violet-600)",
              )}
            >
              <span
                className="ix-gri-pulse"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  background: "var(--color-violet-600)",
                }}
              />
            </span>
          )}
          <span
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              minWidth: 0,
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: C.text,
                whiteSpace: "nowrap",
              }}
            >
              {anyDone
                ? doneCount > 1
                  ? `${doneCount} videos ready`
                  : "Video ready"
                : visible.length > 1
                  ? `${visible.length} videos rendering`
                  : "Video rendering"}
            </span>
            {!anyDone && (
              <span
                style={{
                  fontSize: 11,
                  color: C.body,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                ~{fmtMin(shortestEta)} remaining · project goes live when done
              </span>
            )}
            {anyDone && (
              <span style={{ fontSize: 11, color: C.body }}>
                Tap to review
              </span>
            )}
          </span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            style={{
              color: C.body,
              transform: expanded ? "rotate(180deg)" : undefined,
              transition: "transform .14s",
              flex: "0 0 14px",
            }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {/* Slim baseline progress (when not expanded + active) */}
        {!expanded && anyActive && (
          <CombinedProgressBar jobs={visible} />
        )}

        {expanded && (
          <div
            style={{
              borderTop:
                "var(--border-width-1) solid var(--color-border-subtle)",
              padding: 10,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              maxHeight: "min(70vh, 540px)",
              overflowY: "auto",
            }}
          >
            {visible.map((j) => (
              <JobCard
                key={j.id}
                job={j}
                onReview={() => setReviewingId(j.id)}
                onRegenerate={() => setRegenConfirmFor(j.id)}
                onDismiss={() => dismiss(j.id)}
                onSetEmail={(e) => setEmailReminder(j.id, e)}
                onSetBrowserNotify={(v) => setBrowserNotify(j.id, v)}
              />
            ))}
          </div>
        )}

        <style>{`
          @keyframes ix-gri-pulse-kf { 0%, 100% { opacity: 1 } 50% { opacity: .35 } }
          .ix-gri-pulse { animation: ix-gri-pulse-kf 1.4s ease-in-out infinite; }
        `}</style>
      </div>

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

function CombinedProgressBar({ jobs }: { jobs: VideoJob[] }) {
  // For multiple concurrent jobs, the chip's baseline bar shows the slowest's
  // progress so the user has a worst-case ETA at a glance.
  const minTotal = Math.min(...jobs.map((j) => progressOf(j).total));
  return (
    <div style={{ height: 3, background: "var(--color-bg-surface-raised)" }}>
      <div
        style={{
          height: "100%",
          width: `${minTotal}%`,
          background:
            "linear-gradient(90deg, var(--color-violet-500), var(--color-violet-600))",
          transition: "width .5s linear",
        }}
      />
    </div>
  );
}

function JobCard({
  job,
  onReview,
  onRegenerate,
  onDismiss,
  onSetEmail,
  onSetBrowserNotify,
}: {
  job: VideoJob;
  onReview: () => void;
  onRegenerate: () => void;
  onDismiss: () => void;
  onSetEmail: (email: string | null) => void;
  onSetBrowserNotify: (enabled: boolean) => void;
}) {
  const { total, etaSec } = progressOf(job);
  const stageIdx = STAGE_ORDER.indexOf(job.stage);
  const stageNum = stageIdx >= 0 ? stageIdx + 1 : 0;
  const isDone = job.stage === "done";
  const isFailed = job.stage === "failed";

  const [emailOpen, setEmailOpen] = React.useState(!!job.emailReminder);
  const [email, setEmail] = React.useState(job.emailReminder ?? "");

  return (
    <div
      style={{
        padding: 12,
        background: "var(--color-bg-page)",
        border: `var(--border-width-1) solid ${
          isDone
            ? "var(--color-green-500)"
            : isFailed
              ? "var(--color-red-400, var(--color-border-subtle))"
              : "var(--color-border-subtle)"
        }`,
        borderRadius: "var(--radius-md)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        {/* Thumbnail */}
        <div
          onClick={isDone ? onReview : undefined}
          style={{
            width: 48,
            height: 48,
            flex: "0 0 48px",
            borderRadius: 8,
            background:
              "linear-gradient(135deg, #1e1b4b 0%, #4c1d95 38%, #831843 76%, #fb923c 100%)",
            position: "relative",
            overflow: "hidden",
            cursor: isDone ? "pointer" : "default",
          }}
        >
          {isDone && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="white"
                opacity="0.95"
              >
                <polygon points="7,4 21,12 7,20" />
              </svg>
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: C.text,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {job.title || "Untitled video"}
          </div>
          <div
            style={{
              fontSize: 11,
              color: C.body,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {isDone
              ? "Ready to review"
              : isFailed
                ? "Render failed"
                : `Stage ${stageNum}/5 · ${STAGE_LABELS[job.stage]} · ${Math.ceil(etaSec / 60)}m left`}
          </div>
        </div>
      </div>

      {!isDone && !isFailed && (
        <div
          style={{
            height: 4,
            background: "var(--color-bg-surface-raised)",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${total}%`,
              height: "100%",
              background:
                "linear-gradient(90deg, var(--color-violet-500), var(--color-violet-600))",
              transition: "width .5s linear",
            }}
          />
        </div>
      )}

      {/* Opt-ins — only while rendering */}
      {!isDone && !isFailed && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <Opt
            label="Email me when ready"
            checked={emailOpen}
            onChange={(v) => {
              setEmailOpen(v);
              if (!v) {
                setEmail("");
                onSetEmail(null);
              }
            }}
          >
            {emailOpen && (
              <input
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  onSetEmail(e.target.value);
                }}
                placeholder="you@email.com"
                type="email"
                inputMode="email"
                autoComplete="email"
                style={{
                  flex: 1,
                  height: 26,
                  padding: "0 8px",
                  background: "var(--color-bg-surface)",
                  border:
                    "var(--border-width-1) solid var(--color-border-subtle)",
                  borderRadius: 6,
                  fontSize: 11,
                  color: "var(--color-text-primary)",
                  outline: "none",
                  fontFamily: "inherit",
                  minWidth: 0,
                }}
              />
            )}
          </Opt>
          <Opt
            label="Notify on this browser"
            checked={job.browserNotify}
            onChange={onSetBrowserNotify}
          />
        </div>
      )}

      {/* Actions */}
      <div
        style={{
          display: "flex",
          gap: 6,
          justifyContent: "flex-end",
        }}
      >
        {isDone && (
          <>
            <button
              onClick={onDismiss}
              style={ghostButton}
              aria-label="Dismiss"
            >
              Dismiss
            </button>
            <button onClick={onReview} style={primaryButton}>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <polygon points="7,4 21,12 7,20" />
              </svg>
              Review
            </button>
          </>
        )}
        {isFailed && (
          <>
            <button onClick={onDismiss} style={ghostButton}>
              Dismiss
            </button>
            <button onClick={onRegenerate} style={primaryButton}>
              Retry
            </button>
          </>
        )}
        {!isDone && !isFailed && (
          <button onClick={onDismiss} style={ghostButton}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

function Opt({
  label,
  checked,
  onChange,
  children,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <label
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11,
          color: "var(--color-text-secondary)",
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        <span
          onClick={(e) => {
            e.preventDefault();
            onChange(!checked);
          }}
          style={{
            width: 14,
            height: 14,
            borderRadius: 3,
            border: `1.5px solid ${
              checked
                ? "var(--color-violet-600)"
                : "var(--color-border-default)"
            }`,
            background: checked
              ? "var(--color-violet-600)"
              : "var(--color-bg-surface)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "0 0 14px",
            transition: "background .14s, border-color .14s",
          }}
        >
          {checked && (
            <svg
              width="9"
              height="9"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 13l4 4 10-10" />
            </svg>
          )}
        </span>
        {label}
      </label>
      {children}
    </div>
  );
}

function iconBadge(bg: string, fg: string): React.CSSProperties {
  return {
    width: 22,
    height: 22,
    borderRadius: 11,
    background: bg,
    color: fg,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flex: "0 0 22px",
  };
}

const primaryButton: React.CSSProperties = {
  padding: "6px 12px",
  background: "var(--color-violet-600)",
  color: "var(--color-text-on-brand)",
  border: "none",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
};

const ghostButton: React.CSSProperties = {
  padding: "6px 12px",
  background: "transparent",
  color: "var(--color-text-secondary)",
  border: "var(--border-width-1) solid var(--color-border-subtle)",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
};
