// A post's comments and replies — the rules behind DS M100 Comments
// (IDEEZA Design System, node 3799:842) and the owner's decisions of
// 2026-10-13 (plan D6, D9, D11):
// - three levels: a comment, a reply, a nested reply. A reply to a nested
//   reply stays at the nested level and names who it answers (`replyTo`);
// - one count everywhere: every comment and reply a visitor can see;
// - sort Top · Newest · Oldest, Top first; ten comments a page, three replies
//   a step; replies read oldest first, like a conversation;
// - the ⋯ menu by role: your own comment Edit · Copy link · Delete (DS); a
//   visitor on someone else's Copy link · Report; the post's maker adds
//   Hide · Delete there;
// - a deleted comment with replies stays as "Comment deleted" so the thread
//   holds; one without replies goes;
// - Settings › Blocking › Hide specific words (spec 2026-10-19 §5.10): on a
//   post whose maker hides words, someone else's comment that uses one reads
//   as hidden to everyone but its writer, and the count leaves it out.
//
// Pure: every write returns a new list. Relative imports only.

import { hasHiddenWord } from "../settings/audience";

export type PostComment = {
  id: string;
  postId: string;
  /** null = a comment on the post; else the comment or reply it answers. */
  parentId: string | null;
  /** PostPerson.id; ME_ID for this browser's maker. */
  authorId: string;
  body: string;
  /** Who a nested-level reply answers, when it isn't the reply it sits under (D11). */
  replyTo: string | null;
  /** A photo with the comment: a sample URL, or a downscaled data URL. */
  image: string | null;
  createdAt: number;
  editedAt: number | null;
  /** Hidden by the post's maker: others read "Hidden by the maker". */
  hiddenAt: number | null;
  /** Deleted while it had replies: it stays as "Comment deleted". */
  deletedAt: number | null;
  /** Everyone else's likes. */
  likes: number;
  likedByMe: boolean;
};

export type CommentSort = "top" | "newest" | "oldest";
export const SORTS: readonly { id: CommentSort; label: string }[] = [
  { id: "top", label: "Top" },
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
];

export const COMMENT_MAX = 1000;
export const COMMENT_COUNTER_FROM = 800;
export const COMMENTS_PAGE = 10;
export const REPLIES_STEP = 3;
/** 0 = a comment, 1 = a reply, 2 = a nested reply (DS M100). */
export const MAX_DEPTH = 2;
/** Longer than this reads "See more" until opened. */
export const CLAMP_CHARS = 280;

export type CommentAction = "edit" | "copy" | "delete" | "hide" | "unhide" | "report" | "reported";

/** The post maker's hidden words, when they are known (this browser's own post). */
export type HiddenWords = { ownerId: string; words: readonly string[] };

/** Who is looking: this browser's maker, whether they made the post, and its maker's hidden words. */
export type CommentViewer = { meId: string; isPostOwner: boolean; hiddenWords?: HiddenWords };

/** What the maker reads in place of a comment their hidden words hide. */
export const WORD_HIDDEN_FOR_OWNER = "Hidden: it uses a word you hide";

const byIdOf = (list: readonly PostComment[]) => new Map(list.map((c) => [c.id, c]));

export function depthOf(c: PostComment, list: readonly PostComment[]): number {
  const byId = byIdOf(list);
  let d = 0;
  let cur = c;
  while (cur.parentId !== null) {
    const parent = byId.get(cur.parentId);
    if (!parent) break;
    d += 1;
    cur = parent;
  }
  return d;
}

export function rootOf(c: PostComment, list: readonly PostComment[]): PostComment {
  const byId = byIdOf(list);
  let cur = c;
  while (cur.parentId !== null) {
    const parent = byId.get(cur.parentId);
    if (!parent) break;
    cur = parent;
  }
  return cur;
}

/** Direct replies, oldest first. */
export function childrenOf(list: readonly PostComment[], id: string): PostComment[] {
  return list.filter((c) => c.parentId === id).sort((a, b) => a.createdAt - b.createdAt);
}

export function descendantCount(list: readonly PostComment[], id: string): number {
  return childrenOf(list, id).reduce((n, c) => n + 1 + descendantCount(list, c.id), 0);
}

/** What a visitor sees counted: neither hidden nor deleted. */
export function isCounted(c: PostComment): boolean {
  return c.hiddenAt === null && c.deletedAt === null;
}

/** Someone else's comment that uses a word the post's maker hides. */
export function isWordHidden(c: PostComment, hidden: HiddenWords | undefined): boolean {
  return !!hidden && hidden.words.length > 0 && c.authorId !== hidden.ownerId && c.deletedAt === null && hasHiddenWord(c.body, hidden.words);
}

/** The one comment count (plan §7): card, post and project page all read this. */
export function commentCount(list: readonly PostComment[], hidden?: HiddenWords): number {
  return list.filter((c) => isCounted(c) && !isWordHidden(c, hidden)).length;
}

export function likesOf(c: PostComment): number {
  return c.likes + (c.likedByMe ? 1 : 0);
}

/** Top: likes, plus two for every reply under it; ties go to the newer. */
export function scoreOf(c: PostComment, list: readonly PostComment[]): number {
  return likesOf(c) + 2 * descendantCount(list, c.id);
}

/** The comments on the post (not replies) in `sort` order. `pinned` ids — what this browser just
 *  posted — come first whatever the order, so a new comment never jumps out of sight. */
export function topLevelOf(list: readonly PostComment[], sort: CommentSort, pinned: readonly string[] = []): PostComment[] {
  const tops = list.filter((c) => c.parentId === null);
  const order =
    sort === "newest"
      ? (a: PostComment, b: PostComment) => b.createdAt - a.createdAt
      : sort === "oldest"
        ? (a: PostComment, b: PostComment) => a.createdAt - b.createdAt
        : (a: PostComment, b: PostComment) => scoreOf(b, list) - scoreOf(a, list) || b.createdAt - a.createdAt;
  const sorted = tops.slice().sort(order);
  const pin = new Set(pinned);
  return sorted.filter((c) => pin.has(c.id)).concat(sorted.filter((c) => !pin.has(c.id)));
}

/** Where a reply to `target` goes (D11): under it while there is room, else beside it, naming whom it answers. */
export function replyPlacement(target: PostComment, list: readonly PostComment[]): { parentId: string; replyTo: string | null } {
  if (depthOf(target, list) < MAX_DEPTH) return { parentId: target.id, replyTo: null };
  return { parentId: target.parentId ?? target.id, replyTo: target.authorId };
}

/** Why a body can't be posted; null when it can. */
export function bodyProblem(body: string): string | null {
  const t = body.trim();
  if (!t) return "Write something first.";
  if (t.length > COMMENT_MAX) return `Keep it under ${COMMENT_MAX} characters.`;
  return null;
}

/** The ⋯ menu (DS comment-menu for your own; plan D6 for the rest). */
export function actionsFor(c: PostComment, viewer: CommentViewer, reported: readonly string[]): CommentAction[] {
  if (c.deletedAt !== null) return [];
  if (c.authorId === viewer.meId) return ["edit", "copy", "delete"];
  const report: CommentAction = reported.includes(c.id) ? "reported" : "report";
  if (!viewer.isPostOwner) return ["copy", report];
  return ["copy", c.hiddenAt === null ? "hide" : "unhide", report, "delete"];
}

/** What the viewer reads in a comment's place, or null when they read the comment itself. */
export function placeholderOf(c: PostComment, viewer: CommentViewer): string | null {
  if (c.deletedAt !== null) return "Comment deleted";
  if (c.authorId === viewer.meId) return null;
  if (isWordHidden(c, viewer.hiddenWords)) return viewer.isPostOwner ? WORD_HIDDEN_FOR_OWNER : "Hidden by the maker";
  if (c.hiddenAt !== null && !viewer.isPostOwner) return "Hidden by the maker";
  return null;
}

/** People someone can @mention here: everyone who wrote in this conversation, but the viewer. */
export function mentionablesOf(list: readonly PostComment[], meId: string): string[] {
  const out: string[] = [];
  for (const c of list) {
    if (c.authorId !== meId && c.deletedAt === null && c.hiddenAt === null && !out.includes(c.authorId)) out.push(c.authorId);
  }
  return out;
}

/** The "@…" being typed at the caret, when there is one: an "@" at the start or after a space,
 *  then up to three words on one line. The composer offers names for it as you type. */
export function mentionQueryAt(text: string, caret: number): { start: number; query: string } | null {
  const before = text.slice(0, Math.max(0, Math.min(caret, text.length)));
  const at = before.lastIndexOf("@");
  if (at < 0 || (at > 0 && !/\s/.test(before[at - 1]))) return null;
  const query = before.slice(at + 1);
  if (query.length > 30 || /[\n@]/.test(query) || /\s\s/.test(query) || query.split(" ").length > 3) return null;
  return { start: at, query };
}

/** Who matches what is typed after "@": the whole name or any of its words starts with it. */
export function mentionMatches<P extends { name: string }>(people: readonly P[], query: string, max = 6): P[] {
  const q = query.toLowerCase();
  return people
    .filter((p) => {
      const n = p.name.toLowerCase();
      return !q || n.startsWith(q) || n.split(/\s+/).some((w) => w.startsWith(q));
    })
    .slice(0, max);
}

/** Long bodies read clamped until "See more". */
export function clampBody(body: string, open: boolean): { text: string; clamped: boolean } {
  if (open || body.length <= CLAMP_CHARS) return { text: body, clamped: false };
  const cut = body.slice(0, CLAMP_CHARS - 20);
  const space = cut.lastIndexOf(" ");
  return { text: `${(space > 160 ? cut.slice(0, space) : cut).trimEnd()}…`, clamped: true };
}

/** "2 hours ago" (DS) from two times. */
export function agoLabel(at: number, now: number): string {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} ${m === 1 ? "minute" : "minutes"} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} ${h === 1 ? "hour" : "hours"} ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} ${d === 1 ? "day" : "days"} ago`;
  const mo = Math.round(d / 30);
  if (mo < 12) return `${mo} ${mo === 1 ? "month" : "months"} ago`;
  const y = Math.round(mo / 12);
  return `${y} ${y === 1 ? "year" : "years"} ago`;
}

// ─────────────────────────── writes ───────────────────────────

export type NewComment = {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  image?: string | null;
  /** The comment being answered; absent for a comment on the post. */
  target?: PostComment;
};

export function addComment(list: readonly PostComment[], input: NewComment, now: number): PostComment[] {
  const place = input.target ? replyPlacement(input.target, list) : { parentId: null, replyTo: null };
  const next: PostComment = {
    id: input.id,
    postId: input.postId,
    parentId: place.parentId,
    authorId: input.authorId,
    body: input.body.trim().slice(0, COMMENT_MAX),
    replyTo: place.replyTo,
    image: input.image ?? null,
    createdAt: now,
    editedAt: null,
    hiddenAt: null,
    deletedAt: null,
    likes: 0,
    likedByMe: false,
  };
  return list.concat([next]);
}

function patch(list: readonly PostComment[], id: string, p: Partial<PostComment>): PostComment[] {
  return list.map((c) => (c.id === id ? { ...c, ...p } : c));
}

export function editComment(list: readonly PostComment[], id: string, body: string, now: number): PostComment[] {
  const t = body.trim().slice(0, COMMENT_MAX);
  const cur = list.find((c) => c.id === id);
  if (!cur || !t || t === cur.body) return list.slice();
  return patch(list, id, { body: t, editedAt: now });
}

/** Removes a comment with nothing under it; one with replies stays as "Comment deleted". A
 *  deleted comment whose last reply goes, goes with it. */
export function deleteComment(list: readonly PostComment[], id: string, now: number): PostComment[] {
  const cur = list.find((c) => c.id === id);
  if (!cur) return list.slice();
  let next = childrenOf(list, id).length > 0 ? patch(list, id, { deletedAt: now, body: "", image: null }) : list.filter((c) => c.id !== id);
  let parentId = cur.parentId;
  while (parentId !== null) {
    const parent = next.find((c) => c.id === parentId);
    if (!parent || parent.deletedAt === null || childrenOf(next, parent.id).length > 0) break;
    next = next.filter((c) => c.id !== parent.id);
    parentId = parent.parentId;
  }
  return next;
}

export function setHidden(list: readonly PostComment[], id: string, hidden: boolean, now: number): PostComment[] {
  return patch(list, id, { hiddenAt: hidden ? now : null });
}

export function toggleLike(list: readonly PostComment[], id: string): PostComment[] {
  const cur = list.find((c) => c.id === id);
  return cur ? patch(list, id, { likedByMe: !cur.likedByMe }) : list.slice();
}

// ─────────────────────────── stored shape ───────────────────────────

export type StoredComments = { v: 1; comments: PostComment[]; reported: string[] };

const str = (x: unknown): x is string => typeof x === "string";
const num = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const strOrNull = (x: unknown) => (str(x) ? x : null);
const numOrNull = (x: unknown) => (num(x) ? x : null);

/** One stored comment, shape-checked; null when it isn't one. */
export function commentIn(raw: unknown, postId: string): PostComment | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (!str(r.id) || !str(r.authorId) || !str(r.body) || !num(r.createdAt)) return null;
  return {
    id: r.id,
    postId,
    parentId: strOrNull(r.parentId),
    authorId: r.authorId,
    body: r.body.slice(0, COMMENT_MAX),
    replyTo: strOrNull(r.replyTo),
    image: strOrNull(r.image),
    createdAt: r.createdAt,
    editedAt: numOrNull(r.editedAt),
    hiddenAt: numOrNull(r.hiddenAt),
    deletedAt: numOrNull(r.deletedAt),
    likes: num(r.likes) && r.likes >= 0 ? Math.floor(r.likes) : 0,
    likedByMe: r.likedByMe === true,
  };
}

/** A stored record, shape-checked; null when it isn't one (the seed applies). A reply whose
 *  parent is gone is dropped, so no thread renders an orphan. */
export function storedCommentsIn(raw: unknown, postId: string): StoredComments | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (r.v !== 1 || !Array.isArray(r.comments)) return null;
  let comments = r.comments.map((c) => commentIn(c, postId)).filter((c): c is PostComment => c !== null);
  for (;;) {
    const ids = new Set(comments.map((c) => c.id));
    const kept = comments.filter((c) => c.parentId === null || ids.has(c.parentId));
    if (kept.length === comments.length) break;
    comments = kept;
  }
  const reported = Array.isArray(r.reported) ? r.reported.filter(str) : [];
  return { v: 1, comments, reported };
}
