"use client";

// Step 2 — "Pick your preview"
//
// Storyboard-only. The user describes the video, gets a 3-scene storyboard in
// ~10s, can edit any scene, and continues. The full 10s video is rendered
// AFTER mint (Step 3) and lives in the global VideoJobsProvider so it doesn't
// block this flow at all.
//
// Every intent can record from a phone (AR) or generate from a prompt (AI).
// Only "Add later" (Skip) is locked for Sell / Give — a listing needs a
// preview clip.

import * as React from "react";
import { C } from "@/lib/pcb/colors";
import { BriefCard } from "./brief-app";
import type { BriefState, MediaType, Scene } from "./brief-app";
import { ArRecordPanel } from "./ar-record-panel";
import {
  useVideoJobs,
  progressOf,
  STAGE_LABELS,
  STAGE_ORDER,
  type VideoJob,
} from "@/components/video-jobs/video-jobs-provider";

/** What "Auto Generate Video" writes into the prompt field. */
function autoVideoPrompt(productName: string, productDescription: string): string {
  return `Cinematic product reveal of ${productName}: ${productDescription}. Slow orbit, soft studio light, 10 seconds.`;
}

const LOCK_REASON = "A listing needs a preview clip";

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
  onPromptHelp,
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
  /** Opens the prompt-help modal. Omitted = the help link isn't offered. */
  onPromptHelp?: () => void;
}) {
  const { jobs, setEmailReminder, setBrowserNotify } = useVideoJobs();
  const [editingId, setEditingId] = React.useState<string | null>(null);

  // Sell / Give must ship something to look at, so "Add later" is locked for
  // them. Recording from a phone counts — AR is available to every intent.
  const skipLocked = state.intent === "sell" || state.intent === "give";

  // A locked Skip can't still count as "the" selection. A stored "skip" from
  // before the user switched intent (Save → pick Skip → Back → switch to
  // Sell) must not silently carry forward once Skip is locked — it reads as
  // no choice made yet, same as a fresh Step 2.
  const effectiveMediaType: MediaType | null =
    skipLocked && state.mediaType === "skip" ? null : state.mediaType;

  // The subtitle's recommendation to record is a separate question from
  // whether Skip happens to be locked for this intent, even though today
  // both read the same intents.
  const videoRecommended = state.intent === "sell" || state.intent === "give";

  const hasPrompt = state.videoPrompt.trim().length > 0;
  const canGenerateStoryboard = hasPrompt && !generatingStoryboard;

  // The render job is created when the user clicks "Continue" on Step 2 for an
  // AI flow. Once it exists, we replace the Continue button with an inline
  // render card + a "Continue to mint setup" CTA — user can choose to stay or
  // move on. For AR / Skip / Save-without-AI there's no render at all.
  const job = state.videoJobId
    ? jobs.find((j) => j.id === state.videoJobId) || null
    : null;
  const renderStarted = !!job;

  const canStartRender =
    effectiveMediaType === "ai" && state.storyboardGenerated;
  // AR hands the recording to the phone app, so this step can only wait: until
  // a clip really comes back there is nothing to carry to mint, and Continue
  // stays shut. Nothing in the browser writes `arClip` — that is the point of
  // the waiting state, not an oversight.
  const arClipReady = effectiveMediaType === "ar" && !!state.arClip;
  const canContinueWithoutRender = arClipReady || effectiveMediaType === "skip";
  const continueBlockedReason =
    effectiveMediaType === "ar" && !state.arClip
      ? "The clip hasn't arrived yet"
      : undefined;

  const filledPrompt = autoVideoPrompt(
    state.productName || "your product",
    state.productDescription || "what it does",
  );

  return (
    <BriefCard onBack={onBack}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: C.text,
              margin: 0,
              letterSpacing: -0.2,
            }}
          >
            Pick your preview
          </h1>
          <p style={{ fontSize: 13, color: C.body, marginTop: 6 }}>
            {videoRecommended
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
            sub="Record from your phone"
            status="available"
            selected={effectiveMediaType === "ar"}
            onClick={() => onChange({ mediaType: "ar" })}
            icon={
              <svg
                width="18"
                height="18"
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
            status="recommended"
            selected={effectiveMediaType === "ai"}
            onClick={() => onChange({ mediaType: "ai" })}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10.5 3l1.7 4.8L17 9.5l-4.8 1.7L10.5 16l-1.7-4.8L4 9.5l4.8-1.7z" />
                <path d="M17.5 14l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
              </svg>
            }
          />
          <TypeCard
            id="skip"
            label="Skip"
            sub="Add later"
            status={skipLocked ? "locked" : "available"}
            locked={skipLocked}
            lockReason={LOCK_REASON}
            selected={effectiveMediaType === "skip"}
            onClick={() => {
              if (!skipLocked) onChange({ mediaType: "skip" });
            }}
            icon={
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7.5V12l3 1.8" />
              </svg>
            }
          />
        </div>

        {effectiveMediaType === "ai" && (
          <>
            <FieldGroup
              label="What should the video show?"
              htmlFor="s2-video-prompt"
              right={
                onPromptHelp ? (
                  <button
                    type="button"
                    onClick={onPromptHelp}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--color-text-brand)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Need to prompt help?
                  </button>
                ) : null
              }
            >
              <textarea
                id="s2-video-prompt"
                className="ix-brief-field"
                value={state.videoPrompt}
                onChange={(e) =>
                  onChange({
                    videoPrompt: e.target.value,
                    // Once you write it yourself it is no longer auto-written.
                    autoGenerateVideo: false,
                  })
                }
                placeholder="Write here your description for your new product video"
                rows={3}
                style={textareaStyle}
              />
              <ToggleRow
                label="Auto Generate Video"
                on={state.autoGenerateVideo}
                onChange={(v) =>
                  onChange(
                    v
                      ? { autoGenerateVideo: true, videoPrompt: filledPrompt }
                      : { autoGenerateVideo: false },
                  )
                }
              />
            </FieldGroup>

            <FieldGroup label="Audio prompt" htmlFor="s2-audio-prompt">
              <textarea
                id="s2-audio-prompt"
                className="ix-brief-field"
                value={state.audioPrompt}
                onChange={(e) => onChange({ audioPrompt: e.target.value })}
                placeholder={
                  state.audioAutoGenerate
                    ? "Auto — currently generating ambient + soft synth"
                    : "Describe soundscape - ambient noise, music mood, speech tone..."
                }
                rows={2}
                style={textareaStyle}
              />
              <ToggleRow
                label="Auto Generate Audio"
                on={state.audioAutoGenerate}
                onChange={(v) => onChange({ audioAutoGenerate: v })}
                hint="Suggests a soundscape only — unlike the video toggle, it doesn't write into the field above."
              />
            </FieldGroup>

            <FieldGroup
              label="Quality"
              labelId="s2-quality-label"
              right={
                <span style={{ fontSize: 12, color: C.body }}>
                  Full video is 10s
                </span>
              }
            >
              <div
                role="group"
                aria-labelledby="s2-quality-label"
                style={{
                  display: "inline-flex",
                  alignSelf: "flex-start",
                  gap: 2,
                  padding: 3,
                  background: "var(--color-bg-subtle)",
                  borderRadius: "var(--radius-lg)",
                }}
              >
                <QualityTab
                  selected={state.quality === "low"}
                  onClick={() => onChange({ quality: "low" })}
                >
                  Low · 480p · 10 sec
                </QualityTab>
                <QualityTab
                  selected={state.quality === "high"}
                  onClick={() => onChange({ quality: "high" })}
                >
                  High · 720p · 10 sec
                </QualityTab>
              </div>
            </FieldGroup>

            <span
              title={hasPrompt ? undefined : "Type a prompt first"}
              style={{ display: "block" }}
            >
              <button
                onClick={onGenerateStoryboard}
                disabled={!canGenerateStoryboard}
                title={hasPrompt ? undefined : "Type a prompt first"}
                style={outlineButtonStyle(canGenerateStoryboard)}
              >
                {generatingStoryboard ? (
                  <>
                    <Spinner />
                    Drafting storyboard…
                  </>
                ) : (
                  <>
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden
                    >
                      <path d="M12 3.2l1.9 5.4 5.4 1.9-5.4 1.9-1.9 5.4-1.9-5.4L4.7 10.5l5.4-1.9z" />
                    </svg>
                    Regenerate storyboard
                  </>
                )}
              </button>
            </span>

            {state.storyboardGenerated && !generatingStoryboard && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
                    Storyboard
                  </div>
                  <div style={{ fontSize: 12, color: C.body }}>
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
                      display: "flex",
                      gap: 10,
                      padding: "12px 14px",
                      background: "var(--color-bg-info-subtle)",
                      border:
                        "var(--border-width-1) solid var(--color-border-blue)",
                      borderRadius: "var(--radius-lg)",
                    }}
                  >
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--color-text-blue)"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ flexShrink: 0, marginTop: 1 }}
                      aria-hidden
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 11v5 M12 7.6v.4" />
                    </svg>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--color-text-primary)",
                        }}
                      >
                        Click Continue to start rendering your 10s video
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--color-text-secondary)",
                          marginTop: 2,
                        }}
                      >
                        You will see progress right here. The render keeps
                        running if you leave.
                      </div>
                    </div>
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

            {/* True from the moment there is a storyboard: the next click starts
                a render that never needs this tab to stay open. */}
            {state.storyboardGenerated && !generatingStoryboard && (
              <div style={{ fontSize: 12, color: C.body, lineHeight: 1.5 }}>
                You can stay here and wait, or continue to the mint setup in
                parallel — the render keeps running either way.
              </div>
            )}
          </>
        )}

        {effectiveMediaType === "ar" && (
          <ArRecordPanel
            projectId={state.projectId}
            onSwitchToAi={() => onChange({ mediaType: "ai" })}
          />
        )}

        {effectiveMediaType === "skip" && (
          <div style={{ fontSize: 13, color: C.body }}>
            You can add media later from the project dashboard. Continue to set
            up the mint.
          </div>
        )}

        <div
          style={{
            borderTop: "var(--border-width-1) solid var(--color-border-subtle)",
            paddingTop: 18,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
          }}
        >
          {effectiveMediaType === "ai" ? (
            <span style={{ fontSize: 12, color: C.body }}>
              {!state.storyboardGenerated &&
                "Type a prompt and generate the storyboard."}
              {state.storyboardGenerated &&
                !renderStarted &&
                "Storyboard ready · Continue to start render."}
              {renderStarted && "Render in flight · you can leave any time."}
            </span>
          ) : effectiveMediaType === null ? (
            <span style={{ fontSize: 12, color: C.body }}>
              Skip isn't available for this listing — choose AR or generate an
              AI storyboard to continue.
            </span>
          ) : effectiveMediaType === "ar" ? (
            /* The wait is the state of this step, so it is said here too — and
               Save, which may go on without any media, keeps its way out. */
            <div
              style={{ display: "flex", alignItems: "center", gap: 12 }}
            >
              <span style={{ fontSize: 12, color: C.body }}>
                {state.arClip
                  ? "Clip received from your phone."
                  : "Waiting for the clip from your phone."}
              </span>
              {!skipLocked && <SkipMediaLink onClick={onSkip} />}
            </div>
          ) : !skipLocked && effectiveMediaType !== "skip" ? (
            <SkipMediaLink onClick={onSkip} />
          ) : (
            <span />
          )}
          {!renderStarted ? (
            /* A disabled button takes no pointer events, so the reason has to
               live on a wrapper the cursor can still reach. */
            <span
              title={continueBlockedReason}
              style={{ display: "inline-flex" }}
            >
              <button
                onClick={() => {
                  // AI flow w/ storyboard → kick off render and stay here.
                  // AR (clip in hand) / Skip flows → just navigate forward.
                  if (effectiveMediaType === "ai" && canStartRender) {
                    onStartRender();
                  } else if (canContinueWithoutRender) {
                    onContinue();
                  }
                }}
                disabled={!canStartRender && !canContinueWithoutRender}
                title={continueBlockedReason}
                style={primaryFooterButton(
                  canStartRender || canContinueWithoutRender,
                )}
              >
                Continue
                <ChevronRight />
              </button>
            </span>
          ) : (
            <button onClick={onContinue} style={primaryFooterButton(true)}>
              Continue to mint setup
              <ChevronRight />
            </button>
          )}
        </div>
      </div>
    </BriefCard>
  );
}

// The way past media for a Save brief — the one intent that may go on without
// any preview at all.
function SkipMediaLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent",
        border: "none",
        padding: 0,
        color: C.body,
        fontSize: 13,
        cursor: "pointer",
        textDecoration: "underline",
        textUnderlineOffset: 3,
        fontFamily: "inherit",
      }}
    >
      Skip media
    </button>
  );
}

function ChevronRight() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

// The storyboard button is secondary work on this step — the page's one filled
// button is Continue — so it reads as a full-width outline.
function outlineButtonStyle(enabled: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "12px 20px",
    background: enabled ? "var(--color-bg-surface)" : "var(--color-bg-subtle)",
    color: enabled
      ? "var(--color-text-primary)"
      : "var(--color-text-disabled)",
    border: `var(--border-width-1) solid ${
      enabled ? "var(--color-border-default)" : "var(--color-border-subtle)"
    }`,
    borderRadius: "var(--radius-lg)",
    fontSize: 14,
    fontWeight: 600,
    cursor: enabled ? "pointer" : "not-allowed",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontFamily: "inherit",
    transition: "background .14s, border-color .14s",
  };
}

function primaryFooterButton(enabled: boolean): React.CSSProperties {
  return {
    padding: "11px 22px",
    background: enabled ? C.primary : "var(--color-bg-subtle)",
    color: enabled
      ? "var(--color-text-on-brand)"
      : "var(--color-text-disabled)",
    border: "none",
    borderRadius: "var(--radius-lg)",
    fontSize: 14,
    fontWeight: 600,
    cursor: enabled ? "pointer" : "not-allowed",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontFamily: "inherit",
    transition: "background .14s",
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
        <div style={{ fontSize: 12, color: C.body, lineHeight: 1.5 }}>
          You can leave — the render keeps running and the project goes live
          once it is done.
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

type CardStatus = "available" | "recommended" | "locked";

// The status is the card's own header band — what this way of getting a
// preview costs you is the first thing to read, before the name.
const STATUS_BAND: Record<
  CardStatus,
  { label: string; background: string; color: string }
> = {
  available: {
    label: "Available",
    background: "var(--color-bg-success-subtle)",
    color: "var(--color-text-success)",
  },
  recommended: {
    label: "Recommended",
    background: "var(--gradient-brand)",
    color: "var(--color-text-on-brand)",
  },
  locked: {
    label: "Locked",
    background: "var(--color-bg-subtle)",
    color: "var(--color-text-secondary)",
  },
};

function TypeCard({
  label,
  sub,
  icon,
  status,
  selected,
  locked,
  lockReason,
  onClick,
}: {
  id: MediaType;
  label: string;
  sub: string;
  icon: React.ReactNode;
  status: CardStatus;
  selected: boolean;
  locked?: boolean;
  lockReason?: string;
  onClick: () => void;
}) {
  const band = STATUS_BAND[status];
  return (
    <button
      onClick={() => {
        if (!locked) onClick();
      }}
      aria-disabled={locked || undefined}
      aria-pressed={selected}
      title={locked ? lockReason : undefined}
      style={{
        padding: 0,
        overflow: "hidden",
        textAlign: "left",
        background: "var(--color-bg-surface)",
        border: `var(--border-width-1) solid ${
          selected ? "var(--color-border-brand)" : "var(--color-border-default)"
        }`,
        boxShadow: selected ? "0 0 0 3px var(--color-bg-brand-subtle)" : "none",
        borderRadius: "var(--radius-xl)",
        cursor: locked ? "not-allowed" : "pointer",
        display: "flex",
        flexDirection: "column",
        opacity: locked ? 0.6 : 1,
        transition: "border-color .14s, box-shadow .14s",
      }}
    >
      <span
        style={{
          display: "block",
          padding: "5px 10px",
          background: band.background,
          color: band.color,
          fontSize: 11,
          fontWeight: 600,
        }}
      >
        {band.label}
      </span>
      <span
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          padding: "10px 12px 12px",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            color: selected ? "var(--color-text-brand)" : C.text,
          }}
        >
          {icon}
          <span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span>
        </span>
        <span style={{ fontSize: 12, color: C.body }}>{sub}</span>
      </span>
    </button>
  );
}

function FieldGroup({
  label,
  labelId,
  htmlFor,
  right,
  children,
}: {
  label: string;
  labelId?: string;
  htmlFor?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  const labelStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 600,
    color: "var(--color-text-primary)",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        {htmlFor ? (
          <label htmlFor={htmlFor} style={labelStyle}>
            {label}
          </label>
        ) : (
          <span id={labelId} style={labelStyle}>
            {label}
          </span>
        )}
        {right}
      </div>
      {children}
    </div>
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
        background: "var(--color-bg-subtle)",
        border: `var(--border-width-1) solid ${
          editing ? "var(--color-border-brand)" : "transparent"
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
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
            {scene.label}
          </span>
          <span
            style={{
              fontSize: 12,
              color: "var(--color-text-brand)",
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
            placeholder="No Speech in this scene..."
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
  placeholder,
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
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
        placeholder={placeholder}
        rows={rows}
        style={{
          padding: "8px 10px",
          background: "var(--color-bg-surface)",
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

function QualityTab({
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
      aria-pressed={selected}
      style={{
        padding: "8px 16px",
        background: selected ? "var(--color-bg-surface)" : "transparent",
        border: `var(--border-width-1) solid ${
          selected ? "var(--color-border-subtle)" : "transparent"
        }`,
        boxShadow: selected ? "var(--elevation-1)" : "none",
        borderRadius: "var(--radius-md)",
        color: selected ? "var(--color-text-primary)" : C.body,
        fontSize: 13,
        fontWeight: selected ? 600 : 500,
        fontFamily: "inherit",
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "background .14s, color .14s",
      }}
    >
      {children}
    </button>
  );
}

// The two auto-generate rows sit UNDER their field, at its right edge — the
// switch first, then what it does.
function ToggleRow({
  label,
  on,
  onChange,
  hint,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
  /** Short explanation shown under the row, when the toggle's effect isn't obvious from its label alone. */
  hint?: string;
}) {
  const labelId = React.useId();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 4,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 8,
        }}
      >
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby={labelId}
          onClick={() => onChange(!on)}
          style={{
            width: 34,
            height: 20,
            padding: 0,
            borderRadius: 10,
            border: "none",
            background: on
              ? "var(--color-violet-600)"
              : "var(--color-bg-surface-raised)",
            position: "relative",
            cursor: "pointer",
            transition: "background .14s",
            flex: "0 0 34px",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 2,
              left: on ? 16 : 2,
              width: 16,
              height: 16,
              background: "var(--color-bg-surface)",
              borderRadius: "50%",
              boxShadow: "var(--elevation-1)",
              transition: "left .14s",
            }}
          />
        </button>
        <span
          id={labelId}
          style={{
            fontSize: 13,
            color: "var(--color-text-secondary)",
            fontWeight: 500,
          }}
        >
          {label}
        </span>
      </div>
      {hint && (
        <span
          style={{
            fontSize: 11,
            color: C.body,
            maxWidth: 320,
            textAlign: "right",
          }}
        >
          {hint}
        </span>
      )}
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
        border: "2px solid var(--color-border-default)",
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
  background: "var(--color-input-bg)",
  border: "var(--border-width-1) solid var(--color-border-default)",
  borderRadius: "var(--radius-lg)",
  fontSize: 14,
  color: "var(--color-text-primary)",
  lineHeight: 1.5,
  resize: "vertical",
  outline: "none",
  fontFamily: "inherit",
};
