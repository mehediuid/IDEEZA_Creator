// This browser's reactions on Innovations: the posts it appreciated, saved and
// viewed, and the makers it follows or stopped following. One key,
// `ideeza:innovations:reactions`, read by the feed cards and the post page, so
// the two always show the same heart and the same count (plan P1). The API
// routes beside the feed are stubs that store nothing; this is what persists.
//
// Relative imports only.

import * as React from "react";
import { parseStored, useStoredKey, writeStoredKey } from "../key-store";

export const REACTIONS_KEY = "ideeza:innovations:reactions";

export type Reactions = {
  v: 1;
  appreciated: string[];
  saved: string[];
  viewed: string[];
  /** Per maker id: true = follows, false = stopped. Absent = the sample dataset's own answer. */
  follow: Record<string, boolean>;
};

export const NO_REACTIONS: Reactions = { v: 1, appreciated: [], saved: [], viewed: [], follow: {} };

const ids = (x: unknown): string[] => (Array.isArray(x) ? x.filter((s): s is string => typeof s === "string") : []);

export function reactionsIn(value: unknown): Reactions {
  if (typeof value !== "object" || value === null) return NO_REACTIONS;
  const r = value as Record<string, unknown>;
  const follow: Record<string, boolean> = {};
  if (typeof r.follow === "object" && r.follow !== null) {
    for (const [k, v] of Object.entries(r.follow as Record<string, unknown>)) if (typeof v === "boolean") follow[k] = v;
  }
  return { v: 1, appreciated: ids(r.appreciated), saved: ids(r.saved), viewed: ids(r.viewed), follow };
}

export type ReactionList = "appreciated" | "saved" | "viewed";

export function withToggled(r: Reactions, list: ReactionList, id: string): Reactions {
  const cur = r[list];
  return { ...r, [list]: cur.includes(id) ? cur.filter((x) => x !== id) : cur.concat([id]) };
}

export function withViewed(r: Reactions, id: string): Reactions {
  return r.viewed.includes(id) ? r : { ...r, viewed: r.viewed.concat([id]) };
}

export function withFollow(r: Reactions, makerId: string, on: boolean): Reactions {
  return { ...r, follow: { ...r.follow, [makerId]: on } };
}

/** Whether this browser follows a maker: its own choice, else the dataset's. */
export function follows(r: Reactions, makerId: string, datasetSays: boolean): boolean {
  return r.follow[makerId] ?? datasetSays;
}

/** A post's counts with this browser's own appreciation and view folded in. */
export function countsOf(r: Reactions, postId: string, base: { appreciations: number; views: number }) {
  const appreciated = r.appreciated.includes(postId);
  return {
    appreciated,
    saved: r.saved.includes(postId),
    appreciations: base.appreciations + (appreciated ? 1 : 0),
    views: base.views + (r.viewed.includes(postId) ? 1 : 0),
  };
}

export function useReactions(): {
  hydrated: boolean;
  reactions: Reactions;
  toggle: (list: Exclude<ReactionList, "viewed">, postId: string) => boolean;
  markViewed: (postId: string) => void;
  setFollow: (makerId: string, on: boolean) => boolean;
} {
  const { hydrated, raw } = useStoredKey(REACTIONS_KEY);
  const reactions = React.useMemo(() => {
    const { value } = parseStored(raw);
    return value === undefined ? NO_REACTIONS : reactionsIn(value);
  }, [raw]);
  // Writes read the key afresh through the same store, so two quick presses never lose one.
  // Nothing is written before the key is read, or a first press would wipe what is stored.
  const ref = React.useRef(reactions);
  const readRef = React.useRef(hydrated);
  React.useEffect(() => {
    ref.current = reactions;
    readRef.current = hydrated;
  }, [reactions, hydrated]);
  const save = React.useCallback((next: Reactions) => {
    if (!readRef.current) return false;
    ref.current = next;
    return writeStoredKey(REACTIONS_KEY, next).ok;
  }, []);
  const toggle = React.useCallback(
    (list: Exclude<ReactionList, "viewed">, postId: string) => save(withToggled(ref.current, list, postId)),
    [save],
  );
  const markViewed = React.useCallback(
    (postId: string) => {
      if (!ref.current.viewed.includes(postId)) save(withViewed(ref.current, postId));
    },
    [save],
  );
  const setFollow = React.useCallback((makerId: string, on: boolean) => save(withFollow(ref.current, makerId, on)), [save]);
  return { hydrated, reactions, toggle, markViewed, setFollow };
}
