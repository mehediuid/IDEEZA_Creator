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
import { C } from "@/lib/pcb/colors";
import {
  useVideoJobs,
  progressOf,
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
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.55)",
        backdropFilter: "blur(2px)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="regen-flow-title"
        style={{
          width: "100%",
          maxWidth: 600,
          maxHeight: "min(86vh, 760px)",
          background: "var(--color-bg-surface)",
          borderRadius: "var(--radius-xl)",
          padding: 0,
          boxShadow: "0 30px 80px -20px rgba(0,0,0,.6)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px 12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            borderBottom:
              "var(--border-width-1) solid var(--color-border-subtle)",
          }}
        >
          <div>
            <h2
              id="regen-flow-title"
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 700,
                color: C.text,
                letterSpacing: -0.3,
              }}
            >
              {inRenderPhase
                ? "Render in flight"
                : "Regenerate video"}
            </h2>
            <div
              style={{
                fontSize: 13,
                color: C.body,
                marginTop: 4,
                lineHeight: 1.4,
              }}
            >
              {inRenderPhase ? (
                <>
                  Your listing&rsquo;s video updates automatically when this
                  finishes.
                </>
              ) : (
                <>
                  For: <strong style={{ color: C.text }}>{baseJob.title}</strong>{" "}
                  · Edit the prompt, regenerate the storyboard, then start the
                  new render.
                </>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              color: C.body,
              fontSize: 20,
              cursor: "pointer",
              padding: 4,
              lineHeight: 1,
              flex: "0 0 28px",
            }}
          >
            ×
          </button>
        </div>

        {/* Body — scrollable */}
        <div
          style={{
            padding: "18px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            overflowY: "auto",
            flex: 1,
            minHeight: 0,
          }}
        >
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
                  style={textareaStyle}
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
                  style={{
                    ...textareaStyle,
                    opacity: audioAuto ? 0.7 : 1,
                  }}
                />
              </FieldGroup>

              <FieldGroup
                label="Quality"
                right={
                  <span style={{ fontSize: 11, color: C.body }}>
                    Full video is 10s
                  </span>
                }
              >
                <div style={{ display: "flex", gap: 8 }}>
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
                style={primaryButton(canGenerateStoryboard)}
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
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: C.text,
                      }}
                    >
                      Storyboard
                    </div>
                    <div style={{ fontSize: 11, color: C.body }}>
                      3 scenes · 10s total
                    </div>
                  </div>
                  {scenes.map((s) => (
                    <div
                      key={s.id}
                      style={{
                        padding: "10px 14px",
                        background: "var(--color-bg-page)",
                        border:
                          "var(--border-width-1) solid var(--color-border-subtle)",
                        borderRadius: "var(--radius-md)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: C.text,
                          }}
                        >
                          {s.label}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color: C.primary,
                            fontWeight: 600,
                          }}
                        >
                          {s.timeRange}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: C.body,
                          lineHeight: 1.4,
                        }}
                      >
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
            <div
              style={{
                padding: "10px 12px",
                background: "var(--color-bg-page)",
                border: "var(--border-width-1) solid var(--color-border-subtle)",
                borderRadius: "var(--radius-md)",
                fontSize: 12,
                color: C.body,
                lineHeight: 1.5,
              }}
            >
              You can close this — we&rsquo;ll track progress in the top-right
              indicator. Your listing&rsquo;s video updates the moment this
              finishes.
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 24px 18px",
            borderTop:
              "var(--border-width-1) solid var(--color-border-subtle)",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          {!inRenderPhase && (
            <>
              <button onClick={onClose} style={ghostButton}>
                Cancel
              </button>
              <button
                onClick={startRender}
                disabled={!canStartRender}
                style={ctaButton(canStartRender)}
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
            <button onClick={onClose} style={ctaButton(true)}>
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
  const etaMin = Math.max(1, Math.ceil(etaSec / 60));
  return (
    <div
      style={{
        padding: 18,
        background: "var(--color-bg-surface)",
        border: `var(--border-width-1-5) solid ${
          isDone ? "var(--color-green-500)" : "var(--color-border-brand)"
        }`,
        borderRadius: "var(--radius-lg)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
      role="status"
      aria-live="polite"
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          {isDone ? (
            <span style={iconBadge("var(--color-green-100)", "var(--color-green-700)")}>
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
            <span style={iconBadge("var(--color-bg-brand-subtle)", "var(--color-violet-600)")}>
              <span
                className="ix-rgf-pulse"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  background: "var(--color-violet-600)",
                }}
              />
            </span>
          )}
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
              {isDone ? "Video ready" : "Video rendering"}
            </div>
            <div style={{ fontSize: 11, color: C.body, marginTop: 1 }}>
              {isDone
                ? "Listing video will update"
                : `Stage ${stageNum}/5 · ${STAGE_LABELS[job.stage]}`}
            </div>
          </div>
        </div>
        {!isDone && (
          <span
            style={{
              fontSize: 12,
              color: C.body,
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            ~{etaMin} min left
          </span>
        )}
      </div>

      {!isDone && (
        <div
          style={{
            height: 6,
            background: "var(--color-bg-surface-raised)",
            borderRadius: 3,
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
              height: 30,
              padding: "0 10px",
              background: "var(--color-bg-page)",
              border:
                "var(--border-width-1) solid var(--color-border-subtle)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--color-text-primary)",
              outline: "none",
              fontFamily: "inherit",
              minWidth: 0,
            }}
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
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--color-text-secondary)",
          }}
        >
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
      style={{
        padding: "8px 16px",
        background: selected
          ? "var(--color-bg-brand-subtle)"
          : "var(--color-bg-page)",
        border: `var(--border-width-1) solid ${
          selected
            ? "var(--color-border-brand)"
            : "var(--color-border-subtle)"
        }`,
        borderRadius: 999,
        color: selected ? C.primary : C.body,
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        transition: "background .14s, border-color .14s",
      }}
    >
      {children}
    </button>
  );
}

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
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontSize: 12,
        color: "var(--color-text-secondary)",
        fontWeight: 500,
      }}
    >
      {label}
      <span
        onClick={(e) => {
          e.preventDefault();
          onChange(!on);
        }}
        style={{
          width: 28,
          height: 16,
          borderRadius: 8,
          background: on
            ? "var(--color-violet-600)"
            : "var(--color-bg-surface-raised)",
          position: "relative",
          cursor: "pointer",
          transition: "background .14s",
          flex: "0 0 28px",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: on ? 14 : 2,
            width: 12,
            height: 12,
            background: "var(--color-bg-surface)",
            borderRadius: "50%",
            boxShadow: "0 1px 2px rgba(0,0,0,.2)",
            transition: "left .14s",
          }}
        />
      </span>
    </span>
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
          gap: 8,
          fontSize: 12,
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
            width: 16,
            height: 16,
            borderRadius: 4,
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
            flex: "0 0 16px",
            transition: "background .14s, border-color .14s",
          }}
        >
          {checked && (
            <svg
              width="10"
              height="10"
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

function Spinner() {
  return (
    <span
      style={{
        width: 14,
        height: 14,
        borderRadius: "50%",
        border: "2px solid rgba(255,255,255,0.45)",
        borderTopColor: "currentColor",
        animation: "ix-rgf-spin .8s linear infinite",
        display: "inline-block",
      }}
    >
      <style>{`@keyframes ix-rgf-spin{to{transform:rotate(360deg)}}`}</style>
    </span>
  );
}

function iconBadge(bg: string, fg: string): React.CSSProperties {
  return {
    width: 24,
    height: 24,
    borderRadius: 12,
    background: bg,
    color: fg,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flex: "0 0 24px",
  };
}

function primaryButton(enabled: boolean): React.CSSProperties {
  return {
    padding: "12px 22px",
    background: enabled
      ? "var(--color-violet-600)"
      : "var(--color-bg-surface-raised)",
    color: enabled
      ? "var(--color-text-on-brand)"
      : "var(--color-text-tertiary)",
    border: "none",
    borderRadius: "var(--radius-3xl)",
    fontSize: 14,
    fontWeight: 700,
    cursor: enabled ? "pointer" : "default",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  };
}

function ctaButton(enabled: boolean): React.CSSProperties {
  return {
    padding: "12px 22px",
    background: enabled ? C.primary : "var(--color-bg-surface-raised)",
    color: enabled
      ? "var(--color-text-on-brand)"
      : "var(--color-text-tertiary)",
    border: "none",
    borderRadius: "var(--radius-3xl)",
    fontSize: 14,
    fontWeight: 700,
    cursor: enabled ? "pointer" : "default",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  };
}

const ghostButton: React.CSSProperties = {
  padding: "12px 22px",
  background: "transparent",
  border: "var(--border-width-1) solid var(--color-border-default)",
  borderRadius: "var(--radius-3xl)",
  color: C.text,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const textareaStyle: React.CSSProperties = {
  padding: "12px 14px",
  background: "var(--color-bg-page)",
  border: "var(--border-width-1) solid var(--color-border-subtle)",
  borderRadius: "var(--radius-lg)",
  fontSize: 14,
  color: "var(--color-text-primary)",
  resize: "vertical",
  outline: "none",
  fontFamily: "inherit",
};
