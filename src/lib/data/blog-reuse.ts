// Blog reuse in Settings › Privacy (spec §5.12): the blogs where you ticked
// "Give access to IDEEZA to future use", and taking that back — one blog or
// all of them. The rule is the blog's own (lib/blog/article.ts setReuse): once
// IDEEZA has shared a blog the grant is locked, and only support can change it.
// Pure; relative imports only.

import { displayTitle, setReuse } from "../blog/article";
import { articleHref, slugOf } from "../blog/slug";
import type { BlogData } from "../blog/types";

export type ReuseGrant = {
  id: string;
  title: string;
  href: string;
  /** When you gave access; null when the blog doesn't say. */
  at: number | null;
  /** Set once IDEEZA has shared it: the grant can't be revoked here. */
  sharedOn: { where: string; at: number } | null;
};

/** Every blog that gives IDEEZA access, the most recent grant first. */
export function reuseGrants(data: BlogData): ReuseGrant[] {
  return data.articles
    .filter((a) => a.reuse.allowed)
    .map((a) => ({ id: a.id, title: displayTitle(a), href: articleHref(slugOf(a)), at: a.reuse.at, sharedOn: a.reuse.sharedOn }))
    .sort((a, b) => (b.at ?? 0) - (a.at ?? 0));
}

/** Takes access back from each blog in `ids` that isn't locked. The same data comes back when
 *  nothing changes. */
export function revokeReuse(data: BlogData, ids: readonly string[], now: number): BlogData {
  return ids.reduce((d, id) => setReuse(d, id, false, now), data);
}
