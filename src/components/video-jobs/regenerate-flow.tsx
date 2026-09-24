"use client";

// RegenerateFlow — in-place modal used when the user wants to swap the video
// for an already-minted listing. The brief flow is finished, so navigating
// back to /brief and showing "Continue to mint setup" would be wrong — the
// mint is done. Instead we walk the user through prompt → storyboard → start
// render entirely inside this modal, then drop the old job and queue a new
// one. The listing's mint state is preserved (the new job carries minted=true).
//
// For pre-mint regenerate (job.minted === false), the GlobalRenderIndicator
// keeps using its /brief-Step-2 navigation flow — that path lets the user
// continue to mint as usual.

import * as React from "react";
import {
  useVideoJobs,
  progressOf,
  etaLabel,
  STAGE_LABELS,
  STAGE_ORDER,
  type VideoJob,
} from "./video-jobs-provider";

type Scene = {
  id: string;
  label: string;
  timeRange: string;
  visual: string;
};

export function RegenerateFlow({
  open,
  baseJob,
  onClose,
}: {
  open: boolean;
  baseJob: VideoJob | null;
  onClose: () => void;
}) {
  const { createJob, dismiss, jobs, setEmailReminder, setBrowserNotify } =
    useVideoJobs();

  // Editable form state — pre-filled from the job we're replacing.
  const [prompt, setPrompt] = React.useState("");
  const [audioPrompt, setAudioPrompt] = React.useState("");
  const [audioAuto, setAudioAuto] = React.useState(true);
  const [quality, setQuality] = React.useState<"low" | "high">("low");
  const [scenes, setScenes] = React.useState<Scene[]>([]);
  const [storyboardGenerated, setStoryboardGenerated] = React.useState(false);
  const [generatingStoryboard, setGeneratingStoryboard] = React.useState(false);
  const [newJobId, setNewJobId] = React.useState<string | null>(null);

  // Reset every time the modal opens with a different job — the user might
  // regenerate, close, open the indicator again on the new job, etc.
  React.useEffect(() => {
    if (!open || !baseJob) return;
    setPrompt(baseJob.prompt);
    setAudioPrompt("");
    setAudioAuto(true);
    setQuality(baseJob.quality);
    setScenes([]);
    setStoryboardGenerated(false);
    setGeneratingStoryboard(false);
    setNewJobId(null);
  }, [open, baseJob?.id]);

  const newJob = newJobId
    ? jobs.find((j) => j.id === newJobId) || null
    : null;
  const inRenderPhase = !!newJobId;

  if (!open || !baseJob) return null;

  const canGenerateStoryboard =
    prompt.trim().length > 0 && !generatingStoryboard;
  const canStartRender =
    storyboardGenerated && !generatingStoryboard && prompt.trim().length > 0;

  const generateStoryboard = () => {
    setGeneratingStoryboard(true);
    window.setTimeout(() => {
      setGeneratingStoryboard(false);
      const base: Scene[] = [
        {
          id: "s1",
          label: "Scene 1",
          timeRange: "0–3s",
          visual: `${prompt.slice(0, 80)} — opening shot.`,
        },
        {
          id: "s2",
          label: "Scene 2",
          timeRange: "3–6s",
          visual: `${prompt.slice(0, 80)} — close-up detail.`,
        },
        {
          id: "s3",
          label: "Scene 3",
          timeRange: "6–10s",
          visual: `${prompt.slice(0, 80)} — final reveal with logo.`,
        },
      ];
      setScenes(base);
      setStoryboardGenerated(true);
    }, 1500);
  };

  const startRender = () => {
    // Drop the old (minted) job and queue a fresh one — carry over the
    // minted flag so the new job's regenerate also uses this in-place flow.
    dismiss(baseJob.id);
    const id = createJob({
      title: baseJob.title,
      prompt,
      quality,
      minted: true,
    });
    setNewJobId(id);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-modal flex items-center justify-center bg-[color-mix(in_srgb,var(--color-bg-overlay)_62%,transparent)] p-[24px] backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="regen-flow-title"
        className="flex w-full max-w-[600px] max-h-[min(86vh,760px)] flex-col overflow-hidden rounded-xl bg-bg-surface shadow-5"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-[12px] border-b border-solid border-subtle px-[24px] pb-[12px] pt-[20px]">
          <div>
            <h2 id="regen-flow-title" className="m-0 text-2xl font-bold tracking-tight text-text-primary">
              {inRenderPhase
                ? "Render in flight"
                : "Regenerate video"}
            </h2>
            <div className="mt-[4px] text-sm leading-relaxed text-text-secondary">
              {inRenderPhase ? (
                <>
                  Your listing&rsquo;s video updates automatically when this
                  finishes.
                </>
              ) : (
                <>
                  For: <strong className="text-text-primary">{baseJob.title}</strong>{" "}
                  · Edit the prompt, regenerate the storyboard, then start the
                  new render.
                </>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex-[0_0_28px] p-[4px] text-2xl leading-none text-text-secondary"
          >
            ×
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto px-[24px] py-[18px]">
          {!inRenderPhase && (
            <>
              <FieldGroup label="What should the video show?">
                <textarea
                  value={prompt}
                  onChange={(e) => {
                    setPrompt(e.target.value);
                    // Invalidate the previously generated storyboard so the
                    // user has to re-generate after editing the prompt.
                    if (storyboardGenerated) {
                      setStoryboardGenerated(false);
                      setScenes([]);
                    }
                  }}
                  rows={3}
                  placeholder="Aerial cinematic of a Discord bot ping notification floating over a cityscape at dusk."
                  className={TEXTAREA_CLASS}
                />
              </FieldGroup>

              <FieldGroup
                label="Audio prompt"
                right={
                  <Toggle
                    label="Auto-generate"
                    on={audioAuto}
                    onChange={setAudioAuto}
                  />
                }
              >
                <textarea
                  value={audioPrompt}
                  onChange={(e) => setAudioPrompt(e.target.value)}
                  rows={2}
                  placeholder={
                    audioAuto
                      ? "Auto: ambient + soft synth (override if you want)"
                      : "Describe the soundscape, mood, instruments"
                  }
                  className={`${TEXTAREA_CLASS} ${audioAuto ? "opacity-70" : "opacity-100"}`}
                />
              </FieldGroup>

              <FieldGroup
                label="Quality"
                right={
                  <span className="text-xs text-text-secondary">
                    Full video is 10s
                  </span>
                }
              >
                <div className="flex gap-[8px]">
                  <Pill
                    selected={quality === "low"}
                    onClick={() => setQuality("low")}
                  >
                    Low · 480p
                  </Pill>
                  <Pill
                    selected={quality === "high"}
                    onClick={() => setQuality("high")}
                  >
                    High · 720p
                  </Pill>
                </div>
              </FieldGroup>

              <button
                onClick={generateStoryboard}
                disabled={!canGenerateStoryboard}
                className={primaryButtonClass(canGenerateStoryboard)}
              >
                {generatingStoryboard ? (
                  <>
                    <Spinner />
                    Drafting storyboard…
                  </>
                ) : (
                  <>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z" />
                    </svg>
                    {storyboardGenerated
                      ? "Regenerate storyboard"
                      : "Generate storyboard"}
                  </>
                )}
              </button>

              {storyboardGenerated && (
                <div className="flex flex-col gap-[8px]">
                  <div className="flex items-baseline justify-between">
                    <div className="text-sm font-bold text-text-primary">
                      Storyboard
                    </div>
                    <div className="text-xs text-text-secondary">
                      3 scenes · 10s total
                    </div>
                  </div>
                  {scenes.map((s) => (
                    <div
                      key={s.id}
                      className="flex flex-col gap-[4px] rounded-md border border-solid border-subtle bg-bg-page px-[14px] py-[10px]"
                    >
                      <div className="flex items-center gap-[10px]">
                        <span className="text-sm font-bold text-text-primary">
                          {s.label}
                        </span>
                        <span className="text-xs font-semibold text-text-brand">
                          {s.timeRange}
                        </span>
                      </div>
                      <div className="text-xs leading-relaxed text-text-secondary">
                        {s.visual}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {inRenderPhase && newJob && <ProgressBlock job={newJob} />}

          {inRenderPhase && newJob && newJob.stage !== "done" && (
            <NotifyOptIns
              job={newJob}
              onSetEmail={(e) => setEmailReminder(newJob.id, e)}
              onSetBrowserNotify={(v) => setBrowserNotify(newJob.id, v)}
            />
          )}

          {inRenderPhase && (
            <div className="rounded-md border border-solid border-subtle bg-bg-page px-[12px] py-[10px] text-sm leading-relaxed text-text-secondary">
              You can close this — we&rsquo;ll track progress in the top-right
              indicator. Your listing&rsquo;s video updates the moment this
              finishes.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-[8px] border-t border-solid border-subtle px-[24px] pb-[18px] pt-[14px]">
          {!inRenderPhase && (
            <>
              <button onClick={onClose} className={GHOST_BUTTON_CLASS}>
                Cancel
              </button>
              <button
                onClick={startRender}
                disabled={!canStartRender}
                className={ctaButtonClass(canStartRender)}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <polygon points="6,4 22,12 6,20" />
                </svg>
                Start new render (~20 min)
              </button>
            </>
          )}
          {inRenderPhase && (
            <button onClick={onClose} className={ctaButtonClass(true)}>
              Close
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 18L18 6 M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ProgressBlock({ job }: { job: VideoJob }) {
  const { total, etaSec } = progressOf(job);
  const stageIdx = STAGE_ORDER.indexOf(job.stage);
  const stageNum = stageIdx >= 0 ? stageIdx + 1 : 0;
  const isDone = job.stage === "done";
  return (
    <div
      className={[
        "flex flex-col gap-[12px] rounded-lg border-1-5 border-solid bg-bg-surface p-[18px]",
        isDone ? "border-[var(--color-border-success)]" : "border-border-brand",
      ].join(" ")}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-[10px]">
          {isDone ? (
            <span className={iconBadgeClass("success")}>
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
            <span className={iconBadgeClass("brand")}>
              <span className="ix-rgf-pulse h-[8px] w-[8px] rounded-full bg-bg-brand" />
            </span>
          )}
          <div>
            <div className="text-md font-bold text-text-primary">
              {isDone ? "Video ready" : "Video rendering"}
            </div>
            <div className="mt-[1px] text-xs text-text-secondary">
              {isDone
                ? "Listing video will update"
                : `Stage ${stageNum}/5 · ${STAGE_LABELS[job.stage]}`}
            </div>
          </div>
        </div>
        {!isDone && (
          <span className="text-sm font-semibold tabular-nums text-text-secondary">
            {etaLabel(etaSec)} left
          </span>
        )}
      </div>

      {!isDone && (
        <div className="h-[6px] overflow-hidden rounded-[3px] bg-bg-surface-raised">
          <div
            className="h-full w-full origin-left bg-bg-brand transition-transform duration-slower ease-linear"
            style={{
              // Scaled, not resized: a transform moves on the compositor, where an
              // animated width re-lays the row out every half second.
              transform: `scaleX(${total / 100})`,
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes ix-rgf-pulse-kf { 0%, 100% { opacity: 1 } 50% { opacity: .35 } }
        .ix-rgf-pulse { animation: ix-rgf-pulse-kf 1.4s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

function NotifyOptIns({
  job,
  onSetEmail,
  onSetBrowserNotify,
}: {
  job: VideoJob;
  onSetEmail: (email: string | null) => void;
  onSetBrowserNotify: (enabled: boolean) => void;
}) {
  const [emailOpen, setEmailOpen] = React.useState(!!job.emailReminder);
  const [email, setEmail] = React.useState(job.emailReminder ?? "");
  return (
    <div className="flex flex-col gap-[6px]">
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
            className="h-[30px] min-w-0 flex-1 rounded-lg border border-solid border-subtle bg-bg-page px-[10px] text-sm text-text-primary outline-none"
          />
        )}
      </Opt>
      <Opt
        label="Notify me on this browser"
        checked={job.browserNotify}
        onChange={onSetBrowserNotify}
      />
    </div>
  );
}

// ── tiny primitives ─────────────────────────────────────────────────────

function FieldGroup({
  label,
  right,
  children,
}: {
  label: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-[6px]">
      <span className="flex items-center justify-between">
        <span className="text-sm font-semibold text-text-secondary">
          {label}
        </span>
        {right}
      </span>
      {children}
    </label>
  );
}

function Pill({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "cursor-pointer rounded-full border border-solid px-[16px] py-[8px] text-sm font-semibold transition-colors duration-fast",
        selected
          ? "border-border-brand bg-bg-brand-subtle text-text-brand"
          : "border-subtle bg-bg-page text-text-secondary",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

// A real switch — it was a <span onClick>, which no keyboard could reach — at
// a 24 px target, with an off track that shows against the card.
function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="inline-flex min-h-[32px] items-center gap-[8px] text-sm font-medium text-text-secondary"
    >
      {label}
      <span
        aria-hidden
        className={[
          "relative h-[24px] w-[40px] shrink-0 rounded-full transition-colors duration-fast",
          on ? "bg-bg-brand" : "bg-border-strong",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-[2px] h-[20px] w-[20px] rounded-full bg-bg-surface shadow-1 transition-[left] duration-fast",
            on ? "left-[18px]" : "left-[2px]",
          ].join(" ")}
        />
      </span>
    </button>
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
    <div className="flex items-center gap-[8px]">
      <label className="inline-flex cursor-pointer items-center gap-[8px] text-sm font-medium text-text-secondary">
        <span
          onClick={(e) => {
            e.preventDefault();
            onChange(!checked);
          }}
          className={[
            "inline-flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-[4px] border-1-5 border-solid transition-colors duration-fast",
            checked ? "border-bg-brand bg-bg-brand" : "border-border bg-bg-surface",
          ].join(" ")}
        >
          {checked && (
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-text-on-brand)"
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

function Spinner() {
  return (
    <span className="inline-block h-[14px] w-[14px] animate-[ix-rgf-spin_.8s_linear_infinite] rounded-full border-2 border-solid border-x-[color-mix(in_srgb,currentColor_35%,transparent)] border-b-[color-mix(in_srgb,currentColor_35%,transparent)] border-t-[currentColor]">
      <style>{`@keyframes ix-rgf-spin{to{transform:rotate(360deg)}}`}</style>
    </span>
  );
}

function iconBadgeClass(tone: "success" | "brand"): string {
  return [
    "inline-flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full",
    tone === "success"
      ? "bg-bg-success-subtle text-text-success"
      : "bg-bg-brand-subtle text-text-brand",
  ].join(" ");
}

function primaryButtonClass(enabled: boolean): string {
  return [
    "inline-flex items-center justify-center gap-[8px] rounded-3xl px-[22px] py-[12px] text-md font-bold",
    enabled
      ? "cursor-pointer bg-bg-brand text-text-on-brand"
      : "cursor-default bg-bg-surface-raised text-text-tertiary",
  ].join(" ");
}

function ctaButtonClass(enabled: boolean): string {
  return [
    "inline-flex items-center gap-[8px] rounded-3xl px-[22px] py-[12px] text-md font-bold",
    enabled
      ? "cursor-pointer bg-bg-brand text-text-on-brand"
      : "cursor-default bg-bg-surface-raised text-text-tertiary",
  ].join(" ");
}

const GHOST_BUTTON_CLASS =
  "cursor-pointer rounded-3xl border border-solid border-border px-[22px] py-[12px] text-sm font-semibold text-text-primary";

const TEXTAREA_CLASS =
  "resize-y rounded-lg border border-solid border-subtle bg-bg-page px-[14px] py-[12px] text-md text-text-primary outline-none";
