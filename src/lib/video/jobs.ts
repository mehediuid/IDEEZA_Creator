// The preview-clip job: its model and its progress maths. Pure — no React, no
// storage — so everything that turns a job into "{n} %, about {eta} left" does
// it with the same numbers: the Brief's render step, the global indicator, and
// the project page's Outcome read (`commerceOf`, COM-13), which a node test
// runs. The store and the ticker stay in
// `components/video-jobs/video-jobs-provider.tsx`, which re-exports all of
// this, so its importers are unchanged.

import type { OnScreenLines } from "./types";

export type VideoJobStage =
  | "queued"
  | "drafting"
  | "rendering"
  | "audio"
  | "encoding"
  | "done"
  | "failed";

export type VideoJob = {
  id: string;
  title: string;
  prompt: string;
  quality: "low" | "high";
  stage: VideoJobStage;
  startedAt: number;
  stageStartedAt: number;
  emailReminder: string | null;
  browserNotify: boolean;
  // Optional so a v1 job, which always set this, and a fresh Phase 2 job
  // that hasn't been acknowledged yet, both read as falsy the same way.
  acknowledged?: boolean;
  // True once the brief that owns this job completes its mint step. Once
  // minted, the user's regenerate flow takes a different path: in-place modal
  // (no /brief navigation) since the brief is "done" and they're just swapping
  // the listing's video.
  minted: boolean;
  // Phase 2 (spec §3.3.3, VIDEO §3): which product and project this render
  // belongs to, and what it draws. A legacy (v1) job has none of these — it
  // reads as null, never undefined, so a reader can `??` it without an
  // `in` check.
  projectId?: string | null;
  productId?: string | null;
  render?: { lines: OnScreenLines; imageUrl: string | null; productName: string } | null;
};

export const STAGE_BUDGETS_SEC: Record<
  Exclude<VideoJobStage, "done" | "failed">,
  number
> = {
  queued: 30,
  drafting: 90,
  rendering: 600,
  audio: 300,
  encoding: 180,
};

export const STAGE_LABELS: Record<VideoJobStage, string> = {
  queued: "Queued",
  drafting: "Drafting visual sequences",
  rendering: "Rendering frames",
  audio: "Synthesizing audio",
  encoding: "Encoding & finalising",
  done: "Ready",
  failed: "Failed",
};

export const STAGE_ORDER: VideoJobStage[] = [
  "queued",
  "drafting",
  "rendering",
  "audio",
  "encoding",
];

export const TOTAL_RENDER_SECONDS = Object.values(STAGE_BUDGETS_SEC).reduce(
  (a, b) => a + b,
  0,
);

// Demo speed: scales the 20-min flow to ~30s. Set to 1 for real backend.
export const DEMO_SPEED = 40;

export function progressOf(
  job: VideoJob | null,
  now: number = Date.now(),
): {
  total: number;
  stageElapsedSec: number;
  stageBudget: number;
  etaSec: number;
} {
  if (!job || job.stage === "done")
    return { total: 100, stageElapsedSec: 0, stageBudget: 1, etaSec: 0 };
  if (job.stage === "failed")
    return { total: 0, stageElapsedSec: 0, stageBudget: 1, etaSec: 0 };
  const elapsedSec = ((now - job.startedAt) / 1000) * DEMO_SPEED;
  const total = Math.min(99, (elapsedSec / TOTAL_RENDER_SECONDS) * 100);
  const stageBudget = STAGE_BUDGETS_SEC[job.stage];
  const stageElapsedSec = Math.min(
    stageBudget,
    ((now - job.stageStartedAt) / 1000) * DEMO_SPEED,
  );
  // Wall-clock seconds, which is what a reader waits in. The budgets are in
  // the full-length flow's seconds, so the remainder has to come back down
  // through the demo speed — without it a 30-second render said "18 min left".
  const etaSec = Math.max(0, (TOTAL_RENDER_SECONDS - elapsedSec) / DEMO_SPEED);
  return { total, stageElapsedSec, stageBudget, etaSec };
}

/** "under a minute", "about 3 min" — the time left, in words. */
export function etaLabel(etaSec: number): string {
  if (etaSec < 60) return "under a minute";
  return `about ${Math.ceil(etaSec / 60)} min`;
}
