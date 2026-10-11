// The Innovations post a share carries (owner, 2026-10-12: "Share to
// Innovations checked the videos, fine — but it didn't take my story or
// status"). Every way to share asks for both before it shares: the maker's
// story, and the project's status — one of Activity's stages (journey.ts), the
// project's newest one picked to start with.
//
// Pure, relative imports only.

import { STAGES, type StageId } from "./journey";

export const STORY_MAX = 500;

export type SharePost = {
  /** Why it was built, what others should do with it. */
  story: string;
  /** Where the project is now. */
  stage: StageId | null;
};

const STAGE_IDS = new Set<string>(STAGES.map((s) => s.id));

/** A stored post, shape-checked; undefined when it isn't one. */
export function sharePostIn(raw: unknown): SharePost | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const r = raw as { story?: unknown; stage?: unknown };
  if (typeof r.story !== "string") return undefined;
  return {
    story: r.story.slice(0, STORY_MAX),
    stage: typeof r.stage === "string" && STAGE_IDS.has(r.stage) ? (r.stage as StageId) : null,
  };
}

export const STORY_MISSING = "Write a few words for the post — why you built it, what others can do with it.";
export const STAGE_MISSING = "Pick the project's status for the post.";

/** Why the post can't go out yet; null when it can. */
export function sharePostBlocker(post: SharePost): string | null {
  if (!post.story.trim()) return STORY_MISSING;
  if (!post.stage) return STAGE_MISSING;
  return null;
}

/** "Prototype" — the stage's short word, for a post's status chip. */
export function stageWordOf(stage: StageId | null): string | null {
  return stage ? (STAGES.find((s) => s.id === stage)?.label ?? null) : null;
}
