// The Innovations post a share carries (owner, 2026-10-12: "it didn't take my
// story"). Every way to share asks for the maker's story before it shares. The
// post's status is the project's current activity, read where it shows
// (owner, 2026-10-13), so it is never asked for or stored here; a stored
// `stage` from before is dropped on read.
//
// Pure, relative imports only.

export const STORY_MAX = 500;

export type SharePost = {
  /** Why it was built, what others should do with it. */
  story: string;
};

/** A stored post, shape-checked; undefined when it isn't one. */
export function sharePostIn(raw: unknown): SharePost | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const r = raw as { story?: unknown };
  if (typeof r.story !== "string") return undefined;
  return { story: r.story.slice(0, STORY_MAX) };
}

export const STORY_MISSING = "Write a few words for the post — why you built it, what others can do with it.";

/** Why the post can't go out yet; null when it can. */
export function sharePostBlocker(post: SharePost): string | null {
  return post.story.trim() ? null : STORY_MISSING;
}
