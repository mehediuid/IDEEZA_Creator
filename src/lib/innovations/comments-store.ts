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
import { blockStateOf } from "../messages/rules";
import { useMessages } from "../messages/store";
import { ME } from "../messages/types";
import { useMessagePeople } from "../messages/use-people";
import { canonicalId } from "../people/ids";
import { canComment } from "../settings/audience";
import type { SettingsV1 } from "../settings/prefs";
import { useSettings } from "../settings/use-settings";
import { commentCount, storedCommentsIn, type MakerRules, type PostComment, type StoredComments } from "./comments";
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

/** "Now" for the rules: read on mount, and again the moment a break ends, so what it held
 *  comes back without a reload. */
function useBreakClock(settings: SettingsV1): number {
  const [now, setNow] = React.useState(() => Date.now());
  const until = settings.audience.quietUntil;
  React.useEffect(() => {
    if (until === null || until <= Date.now()) return;
    const id = window.setTimeout(() => setNow(Date.now()), Math.min(until - Date.now() + 50, 2 ** 31 - 1));
    return () => window.clearTimeout(id);
  }, [until]);
  return now;
}

/** Whether this browser's maker blocked the writer of a comment (Innovations ids). */
export function useBlockedAuthors(): (authorId: string) => boolean {
  const { data } = useMessages();
  return React.useMemo(() => {
    const blocked = new Set(data.blocks.filter((b) => b.by === ME).map((b) => b.who));
    return (authorId: string) => blocked.has(canonicalId(authorId, "innovations"));
  }, [data.blocks]);
}

/** On this browser's own post ("mine:…"), your Settings › Privacy & safety: the words you hide,
 *  and who may comment now (your rule, a break, the people you blocked). A sample post's maker
 *  has none we know of. */
export function useMakerRulesFor(postId: string | null): MakerRules | undefined {
  const settings = useSettings();
  const blocked = useBlockedAuthors();
  const { tieOf } = useMessagePeople();
  const now = useBreakClock(settings);
  const mine = !!postId?.startsWith("mine:");
  return React.useMemo(() => {
    if (!mine) return undefined;
    const mayComment = (authorId: string) =>
      canComment(settings, { tie: tieOf(canonicalId(authorId, "innovations")), blocked: blocked(authorId), isOwner: authorId === ME_ID }, now);
    return { ownerId: ME_ID, words: settings.blocking.hiddenWords, mayComment };
  }, [mine, settings, blocked, tieOf, now]);
}

/** Blocked either way between this browser's maker and a post's maker. */
export function useBlockWith(creatorId: string): "none" | "byMe" | "byThem" {
  const { data } = useMessages();
  return blockStateOf(data, ME, canonicalId(creatorId, "innovations"));
}

/** The one count (plan §7) for a card or a page that doesn't show the thread; null until read. */
export function useCommentCount(postId: string | null, seed: CommentSeed): number | null {
  const { hydrated, comments } = usePostComments(postId, seed);
  const rules = useMakerRulesFor(postId);
  return hydrated ? commentCount(comments, rules) : null;
}
