"use client";

// Step 2 — "Pick your preview"
//
// Storyboard-only. The user describes the video, gets a 3-scene storyboard in
// ~10s, can edit any scene, and continues. The full 10s video is rendered
// AFTER mint (Step 3) and lives in the global VideoJobsProvider so it doesn't
// block this flow at all.
//
// Sell + Give intents lock AR and Skip (AI storyboard is required so the
// listing has SOMETHING to show). Save can pick freely.

import * as React from "react";
import { C } from "@/lib/pcb/colors";
import type { BriefState, Scene, MediaType } from "./brief-app";
import {
  useVideoJobs,
  progressOf,
  STAGE_LABELS,
  STAGE_ORDER,
  type VideoJob,
} from "@/components/video-jobs/video-jobs-provider";

export function Step2Video({
  state,
  generatingStoryboard,
  onChange,
  onSceneChange,
  onGenerateStoryboard,
  onStartRender,
  onContinue,
  onSkip,
  onBack,
}: {
  state: BriefState;
  generatingStoryboard: boolean;
  onChange: (patch: Partial<BriefState>) => void;
  onSceneChange: (id: string, patch: Partial<Scene>) => void;
  onGenerateStoryboard: () => void;
  onStartRender: () => void;
  onContinue: () => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  const { jobs, setEmailReminder, setBrowserNotify } = useVideoJobs();
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const videoRequired = state.intent === "sell" || state.intent === "give";
  const canGenerateStoryboard =
    state.videoPrompt.trim().length > 0 && !generatingStoryboard;

  // The render job is created when the user clicks "Continue" on Step 2 for an
  // AI flow. Once it exists, we replace the Continue button with an inline
  // render card + a "Continue to mint setup" CTA — user can choose to stay or
  // move on. For AR / Skip / Save-without-AI there's no render at all.
  const job = state.videoJobId
    ? jobs.find((j) => j.id === state.videoJobId) || null
    : null;
  const renderStarted = !!job;

  const canStartRender = videoRequired
    ? state.mediaType === "ai" && state.storyboardGenerated
    : state.mediaType === "ai" && state.storyboardGenerated;
  const canContinueWithoutRender =
    state.mediaType === "ar" || state.mediaType === "skip";

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 560,
        display: "flex",
        flexDirection: "column",
        gap: 28,
      }}
    >
      <div>
        <div
          onClick={onBack}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: C.body,
            fontSize: 13,
            cursor: "pointer",
            marginBottom: 12,
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 6l-6 6 6 6" />
          </svg>
          Back
        </div>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: C.text,
            margin: 0,
            letterSpacing: -0.5,
          }}
        >
          Pick your preview
        </h1>
        <p style={{ fontSize: 14, color: C.body, marginTop: 6 }}>
          {videoRequired
            ? state.intent === "sell"
              ? "Generate a storyboard for your listing — your 10s video starts rendering when you continue."
              : "Generate a storyboard for the drop — your 10s video starts rendering when you continue."
            : "Pick how you want to record — or skip it for now."}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 10,
        }}
      >
        <TypeCard
          id="ar"
          label="AR"
          sub={videoRequired ? "Not available" : "Record from your phone"}
          recommended={!videoRequired}
          disabled={videoRequired}
          selected={state.mediaType === "ar"}
          onClick={() => {
            if (!videoRequired) onChange({ mediaType: "ar" });
          }}
          icon={
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="6" y="3" width="12" height="18" rx="2" />
              <circle cx="12" cy="17" r="1" />
              <path d="M9 7h6" />
            </svg>
          }
        />
        <TypeCard
          id="ai"
          label="AI"
          sub="Generate from a prompt"
          required={videoRequired}
          selected={state.mediaType === "ai"}
          onClick={() => onChange({ mediaType: "ai" })}
          icon={
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M9 12a3 3 0 0 1 6 0z M12 7v2 M12 15v2 M7 12h2 M15 12h2" />
            </svg>
          }
        />
        <TypeCard
          id="skip"
          label="Skip"
          sub={videoRequired ? "Not available" : "Add later"}
          disabled={videoRequired}
          selected={state.mediaType === "skip"}
          onClick={() => {
            if (!videoRequired) onChange({ mediaType: "skip" });
          }}
          icon={
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 8l7 5-7 5 M13 8l7 5-7 5" />
            </svg>
          }
        />
      </div>

      {state.mediaType === "ai" && (
        <>
          <FieldGroup label="What should the video show?">
            <textarea
              value={state.videoPrompt}
              onChange={(e) => onChange({ videoPrompt: e.target.value })}
              placeholder="Aerial cinematic of a Discord bot ping notification floating over a cityscape at dusk."
              rows={3}
              style={textareaStyle}
            />
          </FieldGroup>

          <FieldGroup
            label="Audio prompt"
            right={
              <Toggle
                small
                label="Auto-generate"
                on={state.audioAutoGenerate}
                onChange={(v) => onChange({ audioAutoGenerate: v })}
              />
            }
          >
            <textarea
              value={state.audioPrompt}
              onChange={(e) => onChange({ audioPrompt: e.target.value })}
              placeholder={
                state.audioAutoGenerate
                  ? "Auto: ambient + soft synth (override if you want)"
                  : "Describe the soundscape, mood, instruments"
              }
              rows={2}
              style={{
                ...textareaStyle,
                opacity: state.audioAutoGenerate ? 0.7 : 1,
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
                selected={state.quality === "low"}
                onClick={() => onChange({ quality: "low" })}
              >
                Low · 480p
              </Pill>
              <Pill
                selected={state.quality === "high"}
                onClick={() => onChange({ quality: "high" })}
              >
                High · 720p
              </Pill>
            </div>
          </FieldGroup>

          <button
            onClick={onGenerateStoryboard}
            disabled={!canGenerateStoryboard}
            style={primaryButtonStyle(
              canGenerateStoryboard && !generatingStoryboard,
            )}
          >
            {generatingStoryboard ? (
              <>
                <Spinner />
                Drafting storyboard…
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z" />
                </svg>
                {state.storyboardGenerated
                  ? "Regenerate storyboard"
                  : "Generate storyboard"}
              </>
            )}
          </button>

          {state.storyboardGenerated && !generatingStoryboard && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                paddingTop: 4,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{ fontSize: 13, fontWeight: 700, color: C.text }}
                >
                  Storyboard
                </div>
                <div style={{ fontSize: 11, color: C.body }}>
                  3 scenes · used as the listing preview
                </div>
              </div>
              {state.scenes.map((s) => (
                <SceneRow
                  key={s.id}
                  scene={s}
                  editing={editingId === s.id}
                  onToggleEdit={() =>
                    setEditingId(editingId === s.id ? null : s.id)
                  }
                  onChange={(patch) => onSceneChange(s.id, patch)}
                />
              ))}
              {!renderStarted && (
                <div
                  style={{
                    marginTop: 4,
                    padding: "10px 12px",
                    background: "var(--color-bg-brand-subtle)",
                    border:
                      "var(--border-width-1) solid var(--color-border-brand)",
                    borderRadius: "var(--radius-md)",
                    fontSize: 12,
                    color: "var(--color-violet-700, var(--color-violet-600))",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flex: "0 0 14px" }}
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4 M12 16h.01" />
                  </svg>
                  <span>
                    Click <strong>Continue</strong> to start rendering your
                    10s video. You&rsquo;ll see progress right here.
                  </span>
                </div>
              )}
            </div>
          )}

          {renderStarted && job && (
            <RenderCard
              job={job}
              onSetEmail={(e) => setEmailReminder(job.id, e)}
              onSetBrowserNotify={(v) => setBrowserNotify(job.id, v)}
            />
          )}
        </>
      )}

      {state.mediaType === "ar" && (
        <div
          style={{
            padding: 24,
            background: "var(--color-bg-surface)",
            border:
              "var(--border-width-1) solid var(--color-border-subtle)",
            borderRadius: "var(--radius-lg)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            textAlign: "center",
          }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-violet-600)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="6" y="2" width="12" height="20" rx="2.5" />
            <circle cx="12" cy="17.5" r="1" />
            <path d="M9 6h6" />
          </svg>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
            Record from your phone
          </div>
          <div style={{ fontSize: 13, color: C.body, maxWidth: 340 }}>
            Open the IDEEZA app on your phone and scan the QR code at the next
            step to start recording.
          </div>
        </div>
      )}

      {state.mediaType === "skip" && (
        <div style={{ fontSize: 13, color: C.body }}>
          You can add media later from the project dashboard. Continue to set
          up the mint.
        </div>
      )}

      {renderStarted && state.mediaType === "ai" && (
        <div
          style={{
            fontSize: 13,
            color: C.body,
            lineHeight: 1.5,
            textAlign: "center",
            padding: "0 8px",
          }}
        >
          You can <strong>stay here</strong> and wait, or continue to the
          mint setup in parallel — the render keeps running either way.
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 4,
        }}
      >
        {videoRequired ? (
          <span style={{ fontSize: 12, color: C.body }}>
            {!state.storyboardGenerated &&
              "Type a prompt and generate the storyboard."}
            {state.storyboardGenerated &&
              !renderStarted &&
              "Storyboard ready · Continue to start render."}
            {renderStarted &&
              "Render in flight · you can leave any time."}
          </span>
        ) : state.mediaType === "skip" ? (
          <span />
        ) : (
          <button
            onClick={onSkip}
            style={{
              background: "transparent",
              border: "none",
              color: C.body,
              fontSize: 13,
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            Skip media
          </button>
        )}
        {!renderStarted ? (
          <button
            onClick={() => {
              // AI flow w/ storyboard → kick off render and stay here.
              // AR / Skip flows → just navigate forward.
              if (state.mediaType === "ai" && canStartRender) {
                onStartRender();
              } else if (canContinueWithoutRender) {
                onContinue();
              }
            }}
            disabled={!canStartRender && !canContinueWithoutRender}
            style={primaryFooterButton(
              canStartRender || canContinueWithoutRender,
            )}
          >
            Continue
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        ) : (
          <button onClick={onContinue} style={primaryFooterButton(true)}>
            Continue to mint setup
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

function primaryButtonStyle(enabled: boolean): React.CSSProperties {
  return {
    padding: "14px 24px",
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
    transition: "background .14s",
  };
}

function primaryFooterButton(enabled: boolean): React.CSSProperties {
  return {
    padding: "14px 32px",
    background: enabled ? C.primary : "var(--color-bg-surface-raised)",
    color: enabled
      ? "var(--color-text-on-brand)"
      : "var(--color-text-tertiary)",
    border: "none",
    borderRadius: "var(--radius-3xl)",
    fontSize: 15,
    fontWeight: 700,
    cursor: enabled ? "pointer" : "default",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  };
}

// RenderCard — inline render-progress card shown on Step 2 once the user
// clicks Continue and the video job starts. Same data model as the
// GlobalRenderIndicator but anchored in-context, so the user has clear
// signal that THIS is what they kicked off.
function RenderCard({
  job,
  onSetEmail,
  onSetBrowserNotify,
}: {
  job: VideoJob;
  onSetEmail: (email: string | null) => void;
  onSetBrowserNotify: (enabled: boolean) => void;
}) {
  const { total, etaSec } = progressOf(job);
  const stageIdx = STAGE_ORDER.indexOf(job.stage);
  const stageNum = stageIdx >= 0 ? stageIdx + 1 : 0;
  const isDone = job.stage === "done";
  const etaMin = Math.max(1, Math.ceil(etaSec / 60));

  const [emailOpen, setEmailOpen] = React.useState(!!job.emailReminder);
  const [email, setEmail] = React.useState(job.emailReminder ?? "");

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        padding: 18,
        background: "var(--color-bg-surface)",
        border: `var(--border-width-1-5) solid ${
          isDone ? "var(--color-green-500)" : "var(--color-border-brand)"
        }`,
        borderRadius: "var(--radius-lg)",
        boxShadow: isDone
          ? "0 6px 20px -6px rgba(34, 197, 94, .22)"
          : "0 6px 20px -6px rgba(124, 45, 185, .22)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{ display: "inline-flex", alignItems: "center", gap: 10 }}
        >
          {isDone ? (
            <span style={badge("var(--color-green-100)", "var(--color-green-700)")}>
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
            <span style={badge("var(--color-bg-brand-subtle)", "var(--color-violet-600)")}>
              <span
                className="ix-s2rc-pulse"
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
                ? "Project will go live once you mint"
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

      {!isDone && (
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
      )}

      <style>{`
        @keyframes ix-s2rc-pulse-kf { 0%, 100% { opacity: 1 } 50% { opacity: .35 } }
        .ix-s2rc-pulse { animation: ix-s2rc-pulse-kf 1.4s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

function badge(bg: string, fg: string): React.CSSProperties {
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

function TypeCard({
  label,
  sub,
  icon,
  selected,
  recommended,
  required,
  disabled,
  onClick,
}: {
  id: MediaType;
  label: string;
  sub: string;
  icon: React.ReactNode;
  selected: boolean;
  recommended?: boolean;
  required?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        position: "relative",
        padding: "16px 12px",
        background: selected
          ? "var(--color-bg-brand-subtle)"
          : "var(--color-bg-surface)",
        border: `var(--border-width-1-5) solid ${
          selected ? "var(--color-border-brand)" : "var(--color-border-subtle)"
        }`,
        borderRadius: "var(--radius-lg)",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        color: selected ? C.primary : C.text,
        transition: "background .14s, border-color .14s",
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {recommended && (
        <span
          style={badgeStyle(
            "var(--color-green-100)",
            "var(--color-green-700)",
          )}
        >
          Recommended
        </span>
      )}
      {required && (
        <span
          style={badgeStyle(
            "var(--color-bg-brand-subtle)",
            "var(--color-violet-600)",
          )}
        >
          Required
        </span>
      )}
      {disabled && !recommended && !required && (
        <span
          style={badgeStyle(
            "var(--color-bg-surface-raised)",
            "var(--color-text-tertiary)",
          )}
        >
          Locked
        </span>
      )}
      {icon}
      <div style={{ fontSize: 13, fontWeight: 700 }}>{label}</div>
      <div
        style={{
          fontSize: 11,
          color: selected ? C.primary : C.body,
          opacity: selected ? 0.85 : 1,
          fontWeight: 500,
          textAlign: "center",
        }}
      >
        {sub}
      </div>
    </button>
  );
}

function badgeStyle(bg: string, fg: string): React.CSSProperties {
  return {
    position: "absolute",
    top: 6,
    right: 6,
    fontSize: 9,
    fontWeight: 700,
    padding: "2px 6px",
    background: bg,
    color: fg,
    borderRadius: 999,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  };
}

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

function SceneRow({
  scene,
  editing,
  onToggleEdit,
  onChange,
}: {
  scene: Scene;
  editing: boolean;
  onToggleEdit: () => void;
  onChange: (patch: Partial<Scene>) => void;
}) {
  return (
    <div
      style={{
        background: "var(--color-bg-surface)",
        border: `var(--border-width-1) solid ${
          editing
            ? "var(--color-border-brand)"
            : "var(--color-border-subtle)"
        }`,
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        transition: "border-color .14s",
      }}
    >
      <div
        onClick={onToggleEdit}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span
            style={{ fontSize: 13, fontWeight: 700, color: C.text }}
          >
            {scene.label}
          </span>
          <span
            style={{
              fontSize: 12,
              color: C.primary,
              fontWeight: 600,
            }}
          >
            {scene.timeRange}
          </span>
        </div>
        <span
          style={{
            fontSize: 12,
            color: C.body,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {editing ? "Done" : "Edit"}
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            style={{
              transform: editing ? "rotate(180deg)" : undefined,
              transition: "transform .14s",
            }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </div>
      {editing && (
        <div
          style={{
            padding: "0 16px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <SceneField
            label="Visual description"
            value={scene.visual}
            onChange={(v) => onChange({ visual: v })}
            rows={2}
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            <SceneField
              label="Background audio"
              value={scene.bgAudio}
              onChange={(v) => onChange({ bgAudio: v })}
              rows={1}
            />
            <SceneField
              label="Music cue"
              value={scene.musicCue}
              onChange={(v) => onChange({ musicCue: v })}
              rows={1}
            />
          </div>
          <SceneField
            label="Speech / Dialogue"
            value={scene.speech}
            onChange={(v) => onChange({ speech: v })}
            rows={1}
          />
        </div>
      )}
    </div>
  );
}

function SceneField({
  label,
  value,
  onChange,
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows: number;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: C.body }}>
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        style={{
          padding: "8px 10px",
          background: "var(--color-bg-page)",
          border: "var(--border-width-1) solid var(--color-border-subtle)",
          borderRadius: "var(--radius-md)",
          fontSize: 13,
          color: "var(--color-text-primary)",
          resize: "none",
          outline: "none",
          fontFamily: "inherit",
        }}
      />
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
          : "var(--color-bg-surface)",
        border: `var(--border-width-1) solid ${
          selected ? "var(--color-border-brand)" : "var(--color-border-subtle)"
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
  small,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  small?: boolean;
}) {
  const w = small ? 28 : 34;
  const h = small ? 16 : 20;
  const knob = small ? 12 : 16;
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
          width: w,
          height: h,
          borderRadius: h / 2,
          background: on
            ? "var(--color-violet-600)"
            : "var(--color-bg-surface-raised)",
          position: "relative",
          cursor: "pointer",
          transition: "background .14s",
          flex: `0 0 ${w}px`,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: on ? w - knob - 2 : 2,
            width: knob,
            height: knob,
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

function Spinner() {
  return (
    <span
      style={{
        width: 14,
        height: 14,
        borderRadius: "50%",
        border: "2px solid rgba(255,255,255,0.45)",
        borderTopColor: "currentColor",
        animation: "ix-brief-spin .8s linear infinite",
        display: "inline-block",
      }}
    >
      <style>{`@keyframes ix-brief-spin{to{transform:rotate(360deg)}}`}</style>
    </span>
  );
}

const textareaStyle: React.CSSProperties = {
  padding: "12px 14px",
  background: "var(--color-bg-surface)",
  border: "var(--border-width-1) solid var(--color-border-subtle)",
  borderRadius: "var(--radius-lg)",
  fontSize: 14,
  color: "var(--color-text-primary)",
  resize: "vertical",
  outline: "none",
  fontFamily: "inherit",
};
