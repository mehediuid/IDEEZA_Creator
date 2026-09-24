"use client";

// Step 4 — Mint Success
//
// Reached after Pay succeeds. The project is only considered "live" when BOTH
// the mint is complete AND the linked video job has finished rendering. While
// the render is still in flight, this screen shows "Mint complete · pending"
// with progress; once the render flips to done (potentially while the user is
// here OR on another page via the global indicator), the screen morphs into
// its finished heading ("Listing is minted" for a sale: the marketplace is not
// open yet, so nothing claims buyers can see it).

import * as React from "react";
import { type BriefState, type Intent } from "./brief-app";
import {
  useVideoJobs,
  progressOf,
  etaLabel,
  STAGE_LABELS,
} from "@/components/video-jobs/video-jobs-provider";

const HEADING_LIVE_BY_INTENT: Record<Intent, string> = {
  sell: "Listing is minted",
  give: "Drop is live",
  save: "Saved",
};

/** The Innovations post is its own outcome — it happens on any of the three. */
const POSTED = " Your post is up on Innovations.";

/**
 * What the mint produced, read against the sequence this brief really ran: a
 * give or a save only makes a clip when it also posts to Innovations, so the
 * video is named only where there is one to name.
 */
function liveSubline(intent: Intent, hasClip: boolean, share: boolean): string {
  const base =
    intent === "sell"
      ? hasClip
        ? "Your video is final and your listing is minted. It goes on sale when the marketplace opens."
        : "Your listing is minted. It goes on sale when the marketplace opens."
      : intent === "give"
        ? hasClip
          ? "Your video is final and the drop is open. Your community can claim it."
          : "The drop is open. Your community can claim it."
        : "Stored in your library. Pick it up any time.";
  return share ? base + POSTED : base;
}

/** Minted, with the render still running — what happens without you. */
function pendingSubline(intent: Intent, share: boolean): string {
  const base =
    intent === "sell"
      ? "Your listing is minted. It goes on sale, with the video, when the marketplace opens."
      : intent === "give"
        ? "We’ll open the drop the moment the video finishes — no extra action needed."
        : "Stored in your library. Pick it up any time.";
  return share
    ? intent === "save"
      ? "Stored in your library. We’ll post it to Innovations the moment the video finishes."
      : base + " The Innovations post goes up with it."
    : base;
}

/**
 * The line under the storyboard, while the render is still running. It has to
 * agree with `pendingSubline` above it — a save that is already stored isn't
 * waiting to "go live" — and it must not name a numbered step: the steps have
 * names now, and the reminder email is set on the render card itself, not on
 * the form.
 */
function pendingCardLine(intent: Intent, share: boolean, quality: string): string {
  const clip = `your ${quality} 10s video`;
  if (intent === "sell") return `Your listing is minted — its video lands as soon as ${clip} finishes.`;
  if (intent === "give") return `The drop opens as soon as ${clip} finishes.`;
  return share
    ? `Your Innovations post goes up as soon as ${clip} finishes.`
    : `It is replaced by ${clip} as soon as that finishes.`;
}

export function Step4Success({
  state,
  onBrowse,
  projectName,
}: {
  state: BriefState;
  onBrowse: (href: string) => void;
  projectName: string;
}) {
  const { jobs } = useVideoJobs();
  const intent = (state.intent || "sell") as Intent;
  const job = state.videoJobId
    ? jobs.find((j) => j.id === state.videoJobId) || null
    : null;
  const willRenderVideo = !!state.videoJobId;
  const videoDone = job?.stage === "done";
  // The project is live when mint is complete AND (no video required OR video done).
  const isLive = !willRenderVideo || videoDone;

  const heading = isLive
    ? HEADING_LIVE_BY_INTENT[intent]
    : "Mint complete";
  const subline = isLive
    ? liveSubline(intent, willRenderVideo || !!state.arClip, state.shareToNewsfeed)
    : pendingSubline(intent, state.shareToNewsfeed);

  return (
    <div className="flex w-full max-w-[560px] flex-col items-center gap-[24px] text-center">
      <div
        className={[
          "flex h-[64px] w-[64px] items-center justify-center rounded-full shadow-2",
          isLive ? "bg-bg-success-subtle" : "bg-bg-brand-subtle",
        ].join(" ")}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke={
            isLive
              ? "var(--color-text-success)"
              : "var(--color-text-brand)"
          }
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 13l4 4 10-10" />
        </svg>
      </div>

      <div>
        <h1 className="m-0 text-5xl font-bold tracking-tight text-text-primary">
          {heading}
        </h1>
        <p className="mt-[6px] max-w-[460px] text-md text-text-secondary">
          {subline}
        </p>
      </div>

      {/* Inline progress while we wait for the video to finalize */}
      {willRenderVideo && !isLive && job && (
        <PendingCard job={job} />
      )}

      {state.scenes.length > 0 && (
        <div className="flex w-full flex-col gap-[14px] rounded-lg border border-solid border-border-subtle bg-bg-surface p-[18px] text-left">
          <div className="flex items-center justify-between">
            <div>
              <div className="mb-[2px] text-sm font-medium text-text-tertiary">
                {projectName || "Listing"}
              </div>
              <div className="text-lg font-bold text-text-primary">
                {state.productName || "Untitled"}
              </div>
            </div>
            {willRenderVideo && (
              <span
                className={[
                  "inline-flex items-center gap-[6px] rounded-full px-[10px] py-[4px] text-sm font-semibold",
                  isLive
                    ? "bg-bg-success-subtle text-text-success"
                    : "bg-bg-brand-subtle text-text-brand",
                ].join(" ")}
              >
                {isLive ? (
                  <>
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 13l4 4 10-10" />
                    </svg>
                    Live
                  </>
                ) : (
                  <>
                    <span
                      className="ix-s4-pulse h-[6px] w-[6px] rounded-full bg-bg-brand"
                    />
                    Pending video
                  </>
                )}
              </span>
            )}
          </div>

          {/* Storyboard scenes — internal-only preview while we wait, full
              video replaces it once live. */}
          <div className="grid grid-cols-3 gap-[8px]">
            {state.scenes.map((scene, i) => (
              <SceneCard key={scene.id} scene={scene} index={i} />
            ))}
          </div>

          {willRenderVideo && !isLive && (
            <div className="flex items-center gap-[8px] rounded-md border border-solid border-border-subtle bg-bg-page px-[12px] py-[10px] text-sm leading-relaxed text-text-secondary">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4 M12 16h.01" />
              </svg>
              <span>
                Storyboard is your private preview for now.{" "}
                {pendingCardLine(
                  intent,
                  state.shareToNewsfeed,
                  state.quality === "low" ? "480p" : "720p",
                )}{" "}
                We&rsquo;ll tell you here when it lands — and email you, if you
                asked for that when the render started.
              </span>
            </div>
          )}
        </div>
      )}

      <div className="flex w-full flex-col items-stretch gap-[10px]">
        <button
          onClick={() => onBrowse("/projects")}
          className="inline-flex items-center justify-center gap-[8px] rounded-3xl border-none bg-bg-brand px-[24px] py-[14px] text-md font-bold text-text-on-brand"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          </svg>
          Go to My Projects
        </button>

        <div className="flex items-center justify-center">
          <a
            onClick={() => onBrowse("/")}
            className="cursor-pointer rounded-full bg-bg-brand-subtle px-[12px] py-[6px] text-sm font-bold text-text-brand no-underline"
          >
            Back to home
          </a>
        </div>
      </div>

      <style>{`
        @keyframes ix-s4-pulse-kf { 0%, 100% { opacity: 1 } 50% { opacity: .35 } }
        .ix-s4-pulse { animation: ix-s4-pulse-kf 1.4s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

function PendingCard({
  job,
}: {
  job: NonNullable<ReturnType<typeof useVideoJobs>["jobs"][number]>;
}) {
  const { total, etaSec } = progressOf(job);
  return (
    <div className="flex w-full flex-col gap-[10px] rounded-lg border border-solid border-border-brand bg-bg-brand-subtle p-[16px] text-left">
      <div className="flex items-center justify-between">
        <div className="text-md font-bold text-text-brand">
          Video is rendering · {STAGE_LABELS[job.stage]}
        </div>
        <div className="tabular-nums text-sm font-semibold text-text-brand">
          {etaLabel(etaSec)} left
        </div>
      </div>
      <div className="h-[6px] overflow-hidden rounded-full bg-bg-surface">
        <div
          // Scaled, not resized: a transform moves on the compositor, where an
          // animated width re-lays the row out every half second.
          className="h-full w-full origin-left bg-bg-brand transition-transform duration-slower ease-linear"
          style={{ transform: `scaleX(${total / 100})` }}
        />
      </div>
    </div>
  );
}

function SceneCard({
  scene,
  index,
}: {
  scene: BriefState["scenes"][number];
  index: number;
}) {
  // Only the brand gradient tokens exist (CLAUDE.md §7 — an agent never mints
  // a design token), so the three-tone poster art becomes an alternation of
  // the two rather than a third invented ramp.
  const gradientClass =
    index % 2 === 0 ? "bg-[image:var(--gradient-brand)]" : "bg-[image:var(--gradient-ai)]";
  return (
    <div
      className={[
        "relative aspect-[9/16] overflow-hidden rounded-md shadow-3",
        gradientClass,
      ].join(" ")}
    >
      {/* A dark scrim behind the caption instead of a text-shadow — the
          caption is white regardless of theme, since it sits on imagery. */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(to_top,color-mix(in_srgb,var(--color-bg-overlay)_70%,transparent),transparent)]" />
      <div className="absolute left-[6px] top-[6px] rounded-sm bg-[color-mix(in_srgb,var(--color-bg-overlay)_70%,transparent)] px-[6px] py-[2px] text-xs font-semibold text-[var(--color-white)]">
        {scene.timeRange}
      </div>
      <div className="absolute bottom-[6px] left-[6px] right-[6px] line-clamp-3 text-xs font-medium leading-[1.3] text-[var(--color-white)]">
        {scene.visual}
      </div>
    </div>
  );
}
