// Reading the stored index and bodies back: every value is shape-checked, and
// anything that doesn't fit is dropped or defaulted rather than trusted. A key
// whose top level isn't the Blog's shape is "unreadable" and never written over.

import { normalizeDoc } from "./doc";
import { isCategoryId } from "./categories";
import {
  EMPTY_BLOG,
  EMPTY_DOC,
  TOPICS_MAX,
  TITLE_MAX,
  type ArticleMeta,
  type BlogArticle,
  type BlogCover,
  type BlogData,
  type ReviewReason,
  type ReviewRound,
  type StoredBody,
  type Submission,
  type SubmissionKind,
} from "./types";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const time = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);
const str = (v: unknown, max: number): string => (typeof v === "string" ? v.slice(0, max) : "");
const KINDS: readonly SubmissionKind[] = ["first", "again", "changes"];
const kindOf = (v: unknown): SubmissionKind => (KINDS.includes(v as SubmissionKind) ? (v as SubmissionKind) : "first");
const clamp = (v: unknown, lo: number, hi: number, d: number): number => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);

export function isBlogShape(v: unknown): boolean {
  return isObj(v) && Array.isArray(v.articles);
}

function cover(v: unknown): BlogCover | null {
  if (!isObj(v)) return null;
  const fileKey = str(v.fileKey, 200);
  if (!fileKey) return null;
  return { fileKey, x: clamp(v.x, 0, 100, 50), y: clamp(v.y, 0, 100, 50), zoom: clamp(v.zoom, 1, 3, 1), alt: str(v.alt, 300) };
}

function meta(v: unknown): ArticleMeta {
  const m = isObj(v) ? v : {};
  const topics = Array.isArray(m.topics) ? m.topics.filter((t): t is string => typeof t === "string" && t.trim() !== "").map((t) => t.slice(0, 32)).slice(0, TOPICS_MAX) : [];
  return {
    title: str(m.title, TITLE_MAX),
    categoryId: isCategoryId(m.categoryId) ? m.categoryId : null,
    topics,
    projectId: typeof m.projectId === "string" && m.projectId ? m.projectId : null,
    cover: cover(m.cover),
  };
}

function reasons(v: unknown): ReviewReason[] {
  if (!Array.isArray(v)) return [];
  return v.filter(isObj).map((r) => ({ id: str(r.id, 60), detail: str(r.detail, 300) })).filter((r) => r.id);
}

function round(v: unknown): ReviewRound | null {
  if (!isObj(v)) return null;
  const at = time(v.at);
  if (at === null || (v.outcome !== "approved" && v.outcome !== "changes")) return null;
  return { at, outcome: v.outcome, reasons: v.outcome === "changes" ? reasons(v.reasons) : [], kind: kindOf(v.kind), seen: v.seen === true, demo: v.demo !== false };
}

function submission(v: unknown): Submission | null {
  if (!isObj(v)) return null;
  const at = time(v.at);
  const decideAt = time(v.decideAt);
  return at !== null && decideAt !== null ? { at, decideAt, kind: kindOf(v.kind) } : null;
}

function reuseOf(v: unknown): BlogArticle["reuse"] {
  if (!isObj(v)) return { allowed: false, at: null, sharedOn: null };
  const shared = isObj(v.sharedOn) ? { where: str(v.sharedOn.where, 40), at: time(v.sharedOn.at) } : null;
  const sharedOn = shared && shared.where && shared.at !== null ? { where: shared.where, at: shared.at } : null;
  // Shared means it was allowed: a stored "not allowed" next to a share can't stand.
  return { allowed: v.allowed === true || !!sharedOn, at: time(v.at), sharedOn };
}

function article(v: unknown): BlogArticle | null {
  if (!isObj(v) || typeof v.id !== "string" || !v.id) return null;
  const createdAt = time(v.createdAt) ?? Date.now();
  let live: BlogArticle["live"] = null;
  if (isObj(v.live)) {
    const approvedAt = time(v.live.approvedAt);
    if (approvedAt !== null) live = { ...meta(v.live), approvedAt };
  }
  const takenAt = isObj(v.takenDown) ? time(v.takenDown.at) : null;
  return {
    id: v.id,
    createdAt,
    updatedAt: time(v.updatedAt) ?? createdAt,
    draft: meta(v.draft),
    live,
    submission: submission(v.submission),
    reviews: Array.isArray(v.reviews) ? v.reviews.map(round).filter((r): r is ReviewRound => r !== null) : [],
    reuse: reuseOf(v.reuse),
    featured: v.featured === true && live !== null,
    takenDown: takenAt !== null && isObj(v.takenDown) ? { at: takenAt, reasons: reasons(v.takenDown.reasons) } : null,
    // The row's own revision (meta writes), kept so it persists across reads.
    ...(typeof v.rev === "number" && Number.isInteger(v.rev) && v.rev >= 0 ? { rev: v.rev } : {}),
  };
}

export function normalizeBlog(v: unknown): BlogData {
  if (!isBlogShape(v)) return EMPTY_BLOG;
  const seen = new Set<string>();
  const articles: BlogArticle[] = [];
  for (const raw of (v as { articles: unknown[] }).articles) {
    const a = article(raw);
    if (!a || seen.has(a.id)) continue;
    seen.add(a.id);
    articles.push(a);
  }
  return { v: 1, articles };
}

export function normalizeBody(v: unknown): StoredBody {
  if (!isObj(v)) return { rev: 0, doc: EMPTY_DOC };
  const rev = typeof v.rev === "number" && Number.isInteger(v.rev) && v.rev >= 0 ? v.rev : 0;
  return { rev, doc: normalizeDoc(v.doc) };
}

export function isBodyShape(v: unknown): boolean {
  return isObj(v) && isObj(v.doc);
}
