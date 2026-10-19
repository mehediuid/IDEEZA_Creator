// A post's comments, live: `ideeza:innovations:comments:<postId>` through the
// shared key store (key-store.ts), so a comment written on the post moves the
// count on its feed card and on the project page at once.
//
// Until the first write, a post reads its seed: the sample conversation of a
// sample post (plan D7), nothing on this browser's own. The first write stores
// the whole list, seed included, so the sample times stop moving from then on.
//
// Relative imports only.

import * as React from "react";
import { parseStored, useStoredKey, writeStoredKey, type WriteResult } from "../key-store";
import { useSettings } from "../settings/use-settings";
import { commentCount, storedCommentsIn, type HiddenWords, type PostComment, type StoredComments } from "./comments";
import { ME_ID } from "./types";

export const COMMENTS_KEY = (postId: string) => `ideeza:innovations:comments:${postId}`;

export type CommentSeed = (now: number) => PostComment[];

export function decodeComments(raw: string | null, postId: string): StoredComments | null {
  const { value } = parseStored(raw);
  return value === undefined ? null : storedCommentsIn(value, postId);
}

/** The minute this tab first read a post: the seed's "now", fixed so a re-render never shifts it. */
function useSeedNow(): number {
  const [now] = React.useState(() => Date.now());
  return now;
}

export function usePostComments(
  postId: string | null,
  seed: CommentSeed,
): {
  hydrated: boolean;
  comments: PostComment[];
  reported: string[];
  write: (next: { comments: PostComment[]; reported: string[] }) => WriteResult;
} {
  const { hydrated, raw } = useStoredKey(postId ? COMMENTS_KEY(postId) : null);
  const now = useSeedNow();
  const stored = React.useMemo(() => (postId ? decodeComments(raw, postId) : null), [raw, postId]);
  const seeded = React.useMemo(() => (postId && !stored ? seed(now) : []), [postId, stored, seed, now]);
  const comments = stored ? stored.comments : seeded;
  const reported = stored ? stored.reported : [];
  const write = React.useCallback(
    (next: { comments: PostComment[]; reported: string[] }) =>
      postId ? writeStoredKey(COMMENTS_KEY(postId), { v: 1, comments: next.comments, reported: next.reported }) : ({ ok: false } as const),
    [postId],
  );
  return { hydrated, comments, reported, write };
}

/** On this browser's own post ("mine:…"), the hidden words of Settings › Blocking; a sample
 *  post's maker has none we know of. */
export function useHiddenWordsFor(postId: string | null): HiddenWords | undefined {
  const words = useSettings().blocking.hiddenWords;
  return React.useMemo(() => (postId?.startsWith("mine:") ? { ownerId: ME_ID, words } : undefined), [postId, words]);
}

/** The one count (plan §7) for a card or a page that doesn't show the thread; null until read. */
export function useCommentCount(postId: string | null, seed: CommentSeed): number | null {
  const { hydrated, comments } = usePostComments(postId, seed);
  const hidden = useHiddenWordsFor(postId);
  return hydrated ? commentCount(comments, hidden) : null;
}
