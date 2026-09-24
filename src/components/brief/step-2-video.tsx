"use client";

// Step 2 — "Pick your preview"
//
// Storyboard-only. The user describes the video, gets a 3-scene storyboard in
// ~10s, can edit any scene, and continues. The full 10s video is rendered
// AFTER mint (Step 3) and lives in the global VideoJobsProvider so it doesn't
// block this flow at all.
//
// Every intent can record from a phone (AR) or generate from a prompt (AI).
// Only "Add later" (Skip) is locked for Sell and for anything being posted
// to Innovations — a listing needs a
// preview clip.

import * as React from "react";
import { BriefCard } from "./brief-app";
import type { BriefState, Intent, MediaType, Scene } from "./brief-app";
import { ArRecordPanel } from "./ar-record-panel";
import { videoScenePrompt } from "@/lib/brief/video-prompt";
import {
  useVideoJobs,
  progressOf,
  etaLabel,
  STAGE_LABELS,
  STAGE_ORDER,
  type VideoJob,
} from "@/components/video-jobs/video-jobs-provider";


const LOCK_LISTING = "A listing needs a preview clip";
const LOCK_POST = "An Innovations post needs a preview clip";

// When this step is the last one, Continue is the commit — so it says what it
// commits to. A sale always has the mint setup after it, so it keeps carrying
// the maker forward.
const FINAL_CTA: Record<Intent, string> = {
  sell: "Continue to mint setup",
  give: "Give to community and post to Innovations",
  save: "Save as Private",
};

/** What the commit is doing while it runs — a give mints, a save stores. */
const BUSY_CTA: Record<Intent, string> = {
  sell: "Minting…",
  give: "Minting…",
  save: "Saving…",
};

const TEXTAREA_CLASS =
  "ix-brief-field w-full resize-y rounded-lg border border-solid border-border bg-[var(--color-input-bg)] px-[14px] py-[12px] text-md leading-relaxed text-text-primary outline-none";

export function Step2Video({
  state,
  generatingStoryboard,
  onChange,
  onSceneChange,
  onGenerateStoryboard,
  onStartRender,
  onContinue,
  onBack,
  isLastStep,
  minting,
  onPromptHelp,
}: {
  state: BriefState;
  generatingStoryboard: boolean;
  onChange: (patch: Partial<BriefState>) => void;
  onSceneChange: (id: string, patch: Partial<Scene>) => void;
  onGenerateStoryboard: () => void;
  onStartRender: () => void;
  onContinue: () => void;
  onBack: () => void;
  /** Is this preview the last thing to answer — so Continue commits? */
  isLastStep: boolean;
  /** The commit is in flight: the CTA says so and takes no second press. */
  minting: boolean;
  /** Opens the prompt-help modal. Omitted = the help link isn't offered. */
  onPromptHelp?: () => void;
}) {
  const { jobs, setEmailReminder, setBrowserNotify } = useVideoJobs();
  const [editingId, setEditingId] = React.useState<string | null>(null);

  // Sell / Give must ship something to look at, so "Add later" is locked for
  // them. Recording from a phone counts — AR is available to every intent.
  // A listing needs a clip, and so does an Innovations post — the feed shows
  // video cards. Everything else may skip: a give with no post and a private
  // save are files, and a 10-second render nobody will watch is work for
  // nothing. Give used to be locked whether or not it was being posted.
  const skipLocked = state.intent === "sell" || state.shareToNewsfeed;

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
  // Finished: nothing is "in flight" any more, and the notes stop saying the
  // render keeps running.
  const renderDone = job?.stage === "done";

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

  // Picking AI starts the prompt from what the brief already knows, as an
  // editable draft. There used to be three ways to fill this one field — type
  // it, an "Auto Generate Video" toggle, and Prompt Help — and the toggle and
  // Prompt Help's fallback wrote the same sentence. Now there is the draft and
  // one helper.
  const draftPrompt = () =>
    videoScenePrompt(
      [state.productName, state.productDescription]
        .map((x) => x.trim())
        .filter(Boolean)
        .join(": ") || "your product",
    );
  const pickAi = () =>
    onChange(
      state.videoPrompt.trim()
        ? { mediaType: "ai" }
        : { mediaType: "ai", videoPrompt: draftPrompt() },
    );
  // AI is the default, so most briefs arrive here with it already picked and
  // the field empty — the draft is written once, on arrival.
  const seeded = React.useRef(false);
  React.useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    if (effectiveMediaType === "ai" && !state.videoPrompt.trim()) {
      onChange({ videoPrompt: draftPrompt() });
    }
    // Once, on arrival: re-running on every edit would write the draft back
    // over a field the maker has just cleared.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const intent = (state.intent || "sell") as Intent;
  // Forward from here is either "start the render and stay" or "carry on" —
  // and when this preview is the last step, carrying on IS the commit, so the
  // button names what it commits to rather than saying "Continue".
  const startsRender = effectiveMediaType === "ai" && canStartRender;
  // Starting the render leaves you standing here, so that press is never the
  // commit whatever the sequence says.
  const commits = isLastStep && !startsRender;
  const forwardLabel = isLastStep ? FINAL_CTA[intent] : "Continue to mint setup";
  // There is no separate "Skip media" link. It could only ever be honest where
  // skipping is allowed AND a step still follows — and `stepsFor` gives those
  // no overlap: Sell/Give lock skipping, and a Save brief only reaches this
  // step with Share to Innovations on, which puts the preview last. The Skip
  // CARD above makes the same choice, and the CTA then names what it commits
  // to, so the way past media is still one click — just not behind a word
  // that would have minted the brief.

  return (
    <BriefCard onBack={onBack}>
      <div className="flex flex-col gap-[20px]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Pick your preview
          </h1>
          <p className="mt-[6px] text-sm leading-relaxed text-text-secondary">
            {videoRecommended
              ? state.intent === "sell"
                ? "Generate a storyboard for your listing — your 10s video starts rendering when you continue."
                : "Generate a storyboard for the drop — your 10s video starts rendering when you continue."
              : "Pick how you want to record — or skip it for now."}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-[10px] sm:grid-cols-3">
          <TypeCard
            id="ar"
            label="AR"
            sub="Record from your phone"
            status="soon"
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
            onClick={pickAi}
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
            lockReason={
              state.intent === "sell" ? LOCK_LISTING : LOCK_POST
            }
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
                    className="px-[4px] min-h-[32px] text-sm font-medium text-text-brand"
                  >
                    Help me write it
                  </button>
                ) : null
              }
            >
              <textarea
                id="s2-video-prompt"
                className={TEXTAREA_CLASS}
                value={state.videoPrompt}
                onChange={(e) => onChange({ videoPrompt: e.target.value })}
                placeholder="Describe the shot — the product, the setting, how the camera moves"
                rows={3}
              />
            </FieldGroup>

            <FieldGroup label="Audio prompt" htmlFor="s2-audio-prompt">
              <textarea
                id="s2-audio-prompt"
                className={TEXTAREA_CLASS}
                value={state.audioPrompt}
                onChange={(e) => onChange({ audioPrompt: e.target.value })}
                placeholder={
                  state.audioAutoGenerate
                    ? "Auto — currently generating ambient + soft synth"
                    : "Describe soundscape - ambient noise, music mood, speech tone..."
                }
                rows={2}
              />
              <ToggleRow
                label="Auto Generate Audio"
                on={state.audioAutoGenerate}
                onChange={(v) => onChange({ audioAutoGenerate: v })}
                hint="Picks the soundscape for you; the field above stays yours."
              />
            </FieldGroup>

            <FieldGroup
              label="Quality"
              labelId="s2-quality-label"
              right={
                <span className="text-sm text-text-secondary">
                  Full video is 10s
                </span>
              }
            >
              <div
                role="group"
                aria-labelledby="s2-quality-label"
                className="inline-flex self-start gap-[2px] rounded-lg bg-bg-subtle p-[3px]"
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
              className="block"
            >
              <button
                onClick={onGenerateStoryboard}
                disabled={!canGenerateStoryboard}
                title={hasPrompt ? undefined : "Type a prompt first"}
                className={outlineButtonStyle(canGenerateStoryboard)}
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
                    {state.storyboardGenerated
                      ? "Regenerate storyboard"
                      : "Generate storyboard"}
                  </>
                )}
              </button>
            </span>

            {state.storyboardGenerated && !generatingStoryboard && (
              <div className="flex flex-col gap-[10px]">
                <div className="flex items-baseline justify-between gap-[12px]">
                  <div className="text-md font-semibold text-text-primary">
                    Storyboard
                  </div>
                  <div className="text-sm text-text-secondary">
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
                  <div className="flex gap-[10px] rounded-lg border border-solid border-[var(--color-border-blue)] bg-bg-info-subtle px-[14px] py-[12px]">
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--color-text-blue)"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mt-[1px] shrink-0"
                      aria-hidden
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 11v5 M12 7.6v.4" />
                    </svg>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-text-primary">
                        Click Continue to start rendering your 10s video
                      </div>
                      <div className="mt-[2px] text-sm text-text-secondary">
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
            {state.storyboardGenerated && !generatingStoryboard && !renderDone && (
              <div className="text-sm leading-relaxed text-text-secondary">
                {isLastStep
                  ? "You can stay here and wait, or go ahead now — the render keeps running either way."
                  : "You can stay here and wait, or continue to the mint setup in parallel — the render keeps running either way."}
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
          <div className="text-sm text-text-secondary">
            You can add media later from the project dashboard. Continue to set
            up the mint.
          </div>
        )}

        <div className="flex items-center justify-between gap-[16px] border-t border-solid border-border-subtle pt-[18px]">
          {effectiveMediaType === "ai" ? (
            <span className="text-sm text-text-secondary">
              {!state.storyboardGenerated &&
                (hasPrompt
                  ? "Generate the storyboard to continue."
                  : "Describe the shot, then generate the storyboard.")}
              {state.storyboardGenerated &&
                !renderStarted &&
                "Storyboard ready · Continue to start render."}
              {/* The line above the rule already says the render keeps
                  running, so on the last step this would be the same fact
                  twice — and the commit needs the width to read in one line. */}
              {renderStarted &&
                !renderDone &&
                !isLastStep &&
                "Render in flight · you can leave any time."}
              {renderDone && "Video ready."}
            </span>
          ) : effectiveMediaType === null ? (
            <span className="text-sm text-text-secondary">
              Skip isn't available for this listing — choose AR or generate an
              AI storyboard to continue.
            </span>
          ) : effectiveMediaType === "ar" ? (
            /* The wait is the state of this step, so it is said here too. */
            <span className="text-sm text-text-secondary">
              {state.arClip
                ? "Clip received from your phone."
                : "Waiting for the clip from your phone."}
            </span>
          ) : (
            <span />
          )}
          {!renderStarted ? (
            /* A disabled button takes no pointer events, so the reason has to
               live on a wrapper the cursor can still reach. */
            <span title={continueBlockedReason} className="inline-flex">
              <button
                onClick={() => {
                  // AI flow w/ storyboard → kick off render and stay here.
                  // AR (clip in hand) / Skip flows → just navigate forward.
                  if (startsRender) {
                    onStartRender();
                  } else if (canContinueWithoutRender) {
                    onContinue();
                  }
                }}
                disabled={
                  (!canStartRender && !canContinueWithoutRender) || minting
                }
                title={continueBlockedReason}
                className={primaryFooterButton(
                  (canStartRender || canContinueWithoutRender) && !minting,
                )}
              >
                <ForwardLabel
                  busy={minting}
                  intent={intent}
                  commits={commits}
                  label={commits ? FINAL_CTA[intent] : "Continue"}
                />
              </button>
            </span>
          ) : (
            <button
              onClick={onContinue}
              disabled={minting}
              className={primaryFooterButton(!minting)}
            >
              <ForwardLabel
                busy={minting}
                intent={intent}
                commits={isLastStep}
                label={forwardLabel}
              />
            </button>
          )}
        </div>
      </div>
    </BriefCard>
  );
}

// What the footer's one filled button says: the commit while it runs, else its
// label. A chevron only where there is somewhere further to go — a commit ends
// the brief, so it carries none.
function ForwardLabel({
  busy,
  intent,
  label,
  commits,
}: {
  busy: boolean;
  intent: Intent;
  label: string;
  commits: boolean;
}) {
  if (busy) {
    return (
      <>
        <Spinner />
        {BUSY_CTA[intent]}
      </>
    );
  }
  return (
    <>
      {label}
      {commits ? null : <ChevronRight />}
    </>
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
function outlineButtonStyle(enabled: boolean): string {
  return [
    "w-full px-[20px] py-[12px] rounded-lg text-md font-semibold inline-flex items-center justify-center gap-[8px]",
    "border border-solid transition-colors duration-fast",
    enabled
      ? "bg-bg-surface text-text-primary border-border"
      : "cursor-not-allowed bg-bg-subtle text-text-disabled border-border-subtle",
  ].join(" ");
}

function primaryFooterButton(enabled: boolean): string {
  return [
    "px-[22px] py-[11px] rounded-lg text-md font-semibold inline-flex items-center gap-[8px]",
    "transition-colors duration-fast",
    enabled
      ? "bg-bg-brand text-text-on-brand"
      : "cursor-not-allowed bg-bg-subtle text-text-disabled",
  ].join(" ");
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

  const [emailOpen, setEmailOpen] = React.useState(!!job.emailReminder);
  const [email, setEmail] = React.useState(job.emailReminder ?? "");

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        "flex flex-col gap-[14px] rounded-lg border-1-5 border-solid bg-bg-surface p-[18px] shadow-2",
        isDone ? "border-[var(--color-border-success)]" : "border-border-brand",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-[10px]">
          {isDone ? (
            <span className={badge("bg-bg-success-subtle", "text-text-success")}>
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
            <span className={badge("bg-bg-brand-subtle", "text-text-brand")}>
              <span
                className="ix-s2rc-pulse h-[8px] w-[8px] rounded-full bg-bg-brand"
              />
            </span>
          )}
          <div>
            <div className="text-md font-bold text-text-primary">
              {isDone ? "Video ready" : "Video rendering"}
            </div>
            <div className="mt-[1px] text-sm text-text-secondary">
              {isDone
                ? "It ships with the listing when you mint"
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
            // Scaled, not resized: a transform moves on the compositor, where an
            // animated width re-lays the row out every half second.
            className="h-full w-full origin-left bg-bg-brand transition-transform duration-slower ease-linear"
            style={{ transform: `scaleX(${total / 100})` }}
          />
        </div>
      )}

      {!isDone && (
        <div className="text-sm leading-relaxed text-text-secondary">
          You can leave — the render keeps running, and the clip is here when
          it finishes.
        </div>
      )}

      {!isDone && (
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
                className="h-[30px] min-w-0 flex-1 rounded-lg border border-solid border-border-subtle bg-bg-page px-[10px] text-sm text-text-primary outline-none"
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

function badge(bgClass: string, fgClass: string): string {
  return `${bgClass} ${fgClass} inline-flex h-[24px] w-[24px] shrink-0 grow-0 items-center justify-center rounded-full`;
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
            "inline-flex h-[16px] w-[16px] shrink-0 grow-0 items-center justify-center rounded-sm",
            "border-1-5 border-solid transition-colors duration-fast",
            checked
              ? "border-border-brand bg-bg-brand"
              : "border-border bg-bg-surface",
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

type CardStatus = "available" | "recommended" | "locked" | "soon";

// The status is the card's own header band — what this way of getting a
// preview costs you is the first thing to read, before the name.
const STATUS_BAND: Record<CardStatus, { label: string; className: string }> = {
  available: {
    label: "Available",
    className: "bg-bg-success-subtle text-text-success",
  },
  // A recommendation is information, not the page's action: the brand's
  // quiet tint, not the gradient slab (white on the gradient's light end also
  // failed contrast in dark).
  recommended: {
    label: "Recommended",
    className: "bg-bg-brand-subtle text-text-brand",
  },
  locked: {
    label: "Locked",
    className: "bg-bg-subtle text-text-secondary",
  },
  // The phone app that records the clip is not released. The card stays —
  // picking it explains that and offers the way to AI — but it no longer
  // wears a green "Available" over a dead end.
  soon: {
    label: "App coming soon",
    className: "bg-bg-warning-subtle text-text-warning",
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
      className={[
        "flex flex-col overflow-hidden rounded-xl text-left",
        "border border-solid bg-bg-surface transition-[border-color,box-shadow] duration-fast",
        selected ? "border-border-brand" : "border-border",
        selected ? "shadow-[0_0_0_3px_var(--color-bg-brand-subtle)]" : "",
        locked ? "cursor-not-allowed opacity-60" : "",
      ].join(" ")}
    >
      <span className={`block px-[10px] py-[5px] text-xs font-semibold ${band.className}`}>
        {band.label}
      </span>
      <span className="flex flex-col gap-[4px] px-[12px] pb-[12px] pt-[10px]">
        <span
          className={`inline-flex items-center gap-[8px] ${
            selected ? "text-text-brand" : "text-text-primary"
          }`}
        >
          {icon}
          <span className="text-md font-semibold">{label}</span>
        </span>
        <span className="text-sm text-text-secondary">{sub}</span>
      </span>
    </button>
  );
}

const FIELD_LABEL_CLASS = "text-md font-semibold text-text-primary";

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
  return (
    <div className="flex flex-col gap-[8px]">
      <div className="flex items-center justify-between gap-[12px]">
        {htmlFor ? (
          <label htmlFor={htmlFor} className={FIELD_LABEL_CLASS}>
            {label}
          </label>
        ) : (
          <span id={labelId} className={FIELD_LABEL_CLASS}>
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
      className={[
        "overflow-hidden rounded-lg border border-solid bg-bg-subtle transition-colors duration-fast",
        editing ? "border-border-brand" : "border-transparent",
      ].join(" ")}
    >
      <div
        onClick={onToggleEdit}
        className="flex cursor-pointer items-center justify-between px-[16px] py-[12px]"
      >
        <div className="flex items-center gap-[12px]">
          <span className="text-sm font-semibold text-text-primary">
            {scene.label}
          </span>
          <span className="text-sm font-semibold text-text-brand">
            {scene.timeRange}
          </span>
        </div>
        <span className="inline-flex items-center gap-[4px] text-sm text-text-secondary">
          {editing ? "Done" : "Edit"}
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            className={`transition-transform duration-fast ${editing ? "rotate-180" : ""}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </div>
      {editing && (
        <div className="flex flex-col gap-[10px] px-[16px] pb-[16px]">
          <SceneField
            label="Visual description"
            value={scene.visual}
            onChange={(v) => onChange({ visual: v })}
            rows={2}
          />
          <div className="grid grid-cols-2 gap-[10px]">
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
    <label className="flex flex-col gap-[4px]">
      <span className="text-xs font-semibold text-text-secondary">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="resize-none rounded-md border border-solid border-border-subtle bg-bg-surface px-[10px] py-[8px] text-sm text-text-primary outline-none"
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
      className={[
        "whitespace-nowrap rounded-md border border-solid px-[16px] py-[8px] text-sm transition-colors duration-fast",
        selected
          ? "border-border-subtle bg-bg-surface font-semibold text-text-primary shadow-1"
          : "border-transparent bg-transparent font-medium text-text-secondary",
      ].join(" ")}
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
    <div className="flex flex-col items-end gap-[4px]">
      <div className="flex items-center justify-end gap-[8px]">
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby={labelId}
          onClick={() => onChange(!on)}
          // A 24 px target, and an off track that shows against the card —
          // the raised-surface grey it used was all but invisible on white.
          className={`relative h-[24px] w-[40px] shrink-0 grow-0 rounded-full transition-colors duration-fast ${
            on ? "bg-bg-brand" : "bg-[var(--color-border-strong)]"
          }`}
        >
          <span
            className={`absolute left-[2px] top-[2px] h-[20px] w-[20px] rounded-full bg-bg-surface shadow-1 transition-transform duration-fast ${
              on ? "translate-x-[16px]" : "translate-x-0"
            }`}
          />
        </button>
        <span id={labelId} className="text-sm font-medium text-text-secondary">
          {label}
        </span>
      </div>
      {hint && (
        <span className="max-w-[320px] text-right text-sm text-text-secondary">
          {hint}
        </span>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-[14px] w-[14px] animate-[ix-brief-spin_0.8s_linear_infinite] rounded-full border-2 border-solid border-border border-t-current">
      <style>{`@keyframes ix-brief-spin{to{transform:rotate(360deg)}}`}</style>
    </span>
  );
}
