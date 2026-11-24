// Your reports on the phone (Settings › Privacy & safety › Your reports, web-vs-phone SET-1):
// where a report's "Open the profile / post / conversation" goes. The rows are the web's
// (reports.ts) and carry web addresses — a creator's profile, an Innovations post or one of its
// comments, a conversation — so the phone maps each to its own screen instead of leaving the app:
// a profile → /m/creators/<handle>, a conversation → /m/messages/<id>, a post → its Feed clip
// (the phone has no Innovations), opened on the comment when the report was about one. A post
// that isn't on the Feed (nothing of it on sale, or no longer shared) opens its project instead.
// Pure, relative imports only (node:test loads it).

import { clipHref } from "../innovations/clips";
import { phoneHrefOf } from "../messages/phone";
import type { ReportRow } from "./reports";

const SAMPLE = "sample:";
const MINE = "mine:";

/** The Feed clip of a post: a sample post's is its feed id, your own project's is the post id
 *  itself (`mine:<projectId>`). null for an id neither kind. */
export function clipIdOfPost(postId: string): string | null {
  if (postId.startsWith(SAMPLE) && postId.length > SAMPLE.length) return postId.slice(SAMPLE.length);
  if (postId.startsWith(MINE) && postId.length > MINE.length) return postId;
  return null;
}

/** The post a reported post's or comment's row is about, and the comment, read from the row's
 *  id (`post:<postId>`, `comment:<postId>:<commentId>`) and the comment's `#comment-<id>`. */
function postOf(row: Pick<ReportRow, "id" | "kind" | "href">): { postId: string; commentId: string | null } | null {
  if (row.kind === "post") {
    const postId = row.id.slice("post:".length);
    return row.id.startsWith("post:") && postId ? { postId, commentId: null } : null;
  }
  const hash = (row.href ?? "").split("#")[1] ?? "";
  const commentId = hash.startsWith("comment-") ? hash.slice("comment-".length) : "";
  const tail = `:${commentId}`;
  if (!commentId || !row.id.startsWith("comment:") || !row.id.endsWith(tail)) return null;
  const postId = row.id.slice("comment:".length, row.id.length - tail.length);
  return postId ? { postId, commentId } : null;
}

/** Where a report's Open goes on the phone, or null when the report has nothing to open there.
 *  `hasClip` says whether a clip is on the Feed now (the screen asks the Feed's clips). */
export function phoneReportHrefOf(row: Pick<ReportRow, "id" | "kind" | "href">, hasClip: (clipId: string) => boolean): string | null {
  if (!row.href) return null;
  if (row.kind === "profile") {
    const m = /^\/creators\/([^/?#]+)/.exec(row.href);
    return m ? `/m/creators/${m[1]}` : null;
  }
  if (row.kind === "message") return /^\/messages\/[^/?#]+/.test(row.href) ? phoneHrefOf(row.href) : null;
  if (row.kind !== "post" && row.kind !== "comment") return null;
  const post = postOf(row);
  const clipId = post ? clipIdOfPost(post.postId) : null;
  if (!post || !clipId) return null;
  if (hasClip(clipId)) return post.commentId ? `${clipHref(clipId)}?comment=${encodeURIComponent(post.commentId)}` : clipHref(clipId);
  const projectId = post.postId.slice(post.postId.indexOf(":") + 1);
  return `/m/projects/${encodeURIComponent(projectId)}`;
}
