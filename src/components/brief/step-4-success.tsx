"use client";

// Step 4 — Mint Success
//
// Reached after Pay succeeds. The project is only considered "live" when BOTH
// the mint is complete AND the linked video job has finished rendering. While
// the render is still in flight, this screen shows "Mint complete · pending"
// with progress; once the render flips to done (potentially while the user is
// here OR on another page via the global indicator), the screen morphs into
// "Listing is live".

import * as React from "react";
import { C } from "@/lib/pcb/colors";
import { PROJECTS, type BriefState, type Intent } from "./brief-app";
import {
  useVideoJobs,
  progressOf,
  STAGE_LABELS,
} from "@/components/video-jobs/video-jobs-provider";

const HEADING_LIVE_BY_INTENT: Record<Intent, string> = {
  sell: "Listing is live",
  give: "Drop is live",
  save: "Saved",
};

const SUBLINE_LIVE_BY_INTENT: Record<Intent, string> = {
  sell: "Your video is final and your listing is on the marketplace. Buyers can see it now.",
  give: "Your video is final and the drop is open. Your community can claim it.",
  save: "Stored in your library. Pick it up any time.",
};

const SUBLINE_PENDING_BY_INTENT: Record<Intent, string> = {
  sell: "We&apos;ll publish your listing the moment the video finishes — no extra action needed.",
  give: "We&apos;ll open the drop the moment the video finishes — no extra action needed.",
  save: "Stored in your library. Pick it up any time.",
};

export function Step4Success({
  state,
  onCreateAnother,
  onBrowse,
}: {
  state: BriefState;
  onCreateAnother: () => void;
  onBrowse: (href: string) => void;
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
    ? SUBLINE_LIVE_BY_INTENT[intent]
    : SUBLINE_PENDING_BY_INTENT[intent];

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 560,
        display: "flex",
        flexDirection: "column",
        gap: 24,
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          background: isLive
            ? "var(--color-green-100)"
            : "var(--color-bg-brand-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: isLive
            ? "0 8px 24px -6px rgba(34, 197, 94, .3)"
            : "0 8px 24px -6px rgba(124, 45, 185, .25)",
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke={
            isLive
              ? "var(--color-green-700)"
              : "var(--color-violet-600)"
          }
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 13l4 4 10-10" />
        </svg>
      </div>

      <div>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: C.text,
            margin: 0,
            letterSpacing: -0.5,
          }}
        >
          {heading}
        </h1>
        <p
          style={{
            fontSize: 14,
            color: C.body,
            marginTop: 6,
            maxWidth: 460,
          }}
          dangerouslySetInnerHTML={{ __html: subline }}
        />
      </div>

      {/* Inline progress while we wait for the video to finalize */}
      {willRenderVideo && !isLive && job && (
        <PendingCard job={job} />
      )}

      {state.scenes.length > 0 && (
        <div
          style={{
            width: "100%",
            background: "var(--color-bg-surface)",
            border:
              "var(--border-width-1) solid var(--color-border-subtle)",
            borderRadius: "var(--radius-lg)",
            padding: 18,
            display: "flex",
            flexDirection: "column",
            gap: 14,
            textAlign: "left",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.primary,
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                  marginBottom: 2,
                }}
              >
                {PROJECTS.find((p) => p.id === state.projectId)?.name ||
                  "Listing"}
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: C.text,
                }}
              >
                {state.productName || "Untitled"}
              </div>
            </div>
            {willRenderVideo && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px",
                  background: isLive
                    ? "var(--color-green-100)"
                    : "var(--color-bg-brand-subtle)",
                  color: isLive
                    ? "var(--color-green-700)"
                    : "var(--color-violet-600)",
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: 999,
                  textTransform: "uppercase",
                  letterSpacing: 0.3,
                }}
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
                      className="ix-s4-pulse"
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        background: "var(--color-violet-600)",
                      }}
                    />
                    Pending video
                  </>
                )}
              </span>
            )}
          </div>

          {/* Storyboard scenes — internal-only preview while we wait, full
              video replaces it once live. */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 8,
            }}
          >
            {state.scenes.map((scene, i) => (
              <SceneCard key={scene.id} scene={scene} index={i} />
            ))}
          </div>

          {willRenderVideo && !isLive && (
            <div
              style={{
                padding: "10px 12px",
                background: "var(--color-bg-page)",
                border:
                  "var(--border-width-1) solid var(--color-border-subtle)",
                borderRadius: "var(--radius-md)",
                fontSize: 12,
                color: C.body,
                display: "flex",
                alignItems: "center",
                gap: 8,
                lineHeight: 1.5,
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
                Storyboard is your private preview for now. Project goes live
                as soon as your {state.quality === "low" ? "480p" : "720p"} 10s
                video finishes — we&rsquo;ll notify you on this browser and at
                the email you set on Step 3.
              </span>
            </div>
          )}
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          width: "100%",
          alignItems: "stretch",
        }}
      >
        <button
          onClick={onCreateAnother}
          style={{
            padding: "14px 24px",
            background: "var(--color-violet-600)",
            color: "var(--color-text-on-brand)",
            border: "none",
            borderRadius: "var(--radius-3xl)",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
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
            <path d="M12 5v14 M5 12h14" />
          </svg>
          Create another brief
        </button>

        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 12, color: C.body }}>or jump to</span>
          <a onClick={() => onBrowse("/pcb")} style={linkButton}>
            PCB
          </a>
          <a onClick={() => onBrowse("/code")} style={linkButton}>
            Code
          </a>
          <a onClick={() => onBrowse("/3d")} style={linkButton}>
            3D
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
  const etaMin = Math.max(1, Math.ceil(etaSec / 60));
  return (
    <div
      style={{
        width: "100%",
        padding: 16,
        background: "var(--color-bg-brand-subtle)",
        border: "var(--border-width-1) solid var(--color-border-brand)",
        borderRadius: "var(--radius-lg)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        textAlign: "left",
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
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--color-violet-700, var(--color-violet-600))",
          }}
        >
          Video is rendering · {STAGE_LABELS[job.stage]}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--color-violet-700, var(--color-violet-600))",
            fontVariantNumeric: "tabular-nums",
            fontWeight: 600,
          }}
        >
          ~{etaMin} min left
        </div>
      </div>
      <div
        style={{
          height: 6,
          background: "rgba(255,255,255,.55)",
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
  const gradients = [
    "linear-gradient(135deg, #1e1b4b 0%, #4c1d95 100%)",
    "linear-gradient(135deg, #4c1d95 0%, #831843 100%)",
    "linear-gradient(135deg, #831843 0%, #fb923c 100%)",
  ];
  return (
    <div
      style={{
        aspectRatio: "9 / 16",
        background: gradients[index % gradients.length],
        borderRadius: "var(--radius-md)",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 4px 12px -4px rgba(0,0,0,.2)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 6,
          left: 6,
          fontSize: 9,
          fontWeight: 700,
          padding: "2px 6px",
          background: "rgba(0,0,0,.5)",
          color: "white",
          borderRadius: 4,
          textTransform: "uppercase",
          letterSpacing: 0.3,
        }}
      >
        {scene.timeRange}
      </div>
      <div
        style={{
          position: "absolute",
          left: 6,
          right: 6,
          bottom: 6,
          fontSize: 10,
          color: "rgba(255,255,255,0.92)",
          fontWeight: 500,
          textShadow: "0 1px 2px rgba(0,0,0,0.5)",
          lineHeight: 1.3,
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {scene.visual}
      </div>
    </div>
  );
}

const linkButton: React.CSSProperties = {
  padding: "6px 12px",
  fontSize: 12,
  fontWeight: 700,
  color: "var(--color-violet-600)",
  textDecoration: "none",
  cursor: "pointer",
  background: "var(--color-bg-brand-subtle)",
  borderRadius: 999,
};
