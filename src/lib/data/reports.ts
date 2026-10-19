// Reports you made (Settings › Report, spec §5.12): every report this browser
// sent, read from where each kind is kept — profile reports
// (`ideeza:people:reports`), reported posts (`ideeza:innovations:reported-posts`),
// reported comments (each post's `ideeza:innovations:comments:<postId>`),
// message reports (`ideeza:messages`) and Report a problem references
// (`ideeza:support:sent`, kept here from now on). Nobody reviews a report in
// the app yet, so each one says it was received and not reviewed. Posts and
// comments keep only that you reported them: no date and no reason, and the
// page says so rather than inventing one.
// Relative imports only (node:test loads it).

import { conversationHref } from "../messages/links";
import { REPORT_REASONS as PROFILE_REASONS } from "../people/reports";
import { KINDS as PROBLEM_KINDS, type ReportKind as ProblemKind } from "../support/problem-report";
import { parseStored, readStoredKey, writeStoredKey } from "../key-store";

export const SENT_REPORTS_KEY = "ideeza:support:sent";
export const SENT_MAX = 200;

export const STATUS_RECEIVED = "Received, not reviewed yet";
export const STATUS_SENT = "Sent to the IDEEZA team";

export type SentReport = { ref: string; kind: ProblemKind; title: string; at: number };

const PROBLEM_KIND_IDS = new Set<string>(PROBLEM_KINDS.map((k) => k.value));
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

export function normalizeSentReports(raw: unknown): SentReport[] {
  if (!Array.isArray(raw)) return [];
  const out: SentReport[] = [];
  for (const r of raw) {
    if (!isObj(r) || typeof r.ref !== "string" || !r.ref.trim() || typeof r.at !== "number") continue;
    if (out.some((x) => x.ref === r.ref)) continue;
    const kind = typeof r.kind === "string" && PROBLEM_KIND_IDS.has(r.kind) ? (r.kind as ProblemKind) : "other";
    out.push({ ref: r.ref.trim().slice(0, 40), kind, title: typeof r.title === "string" ? r.title.slice(0, 120) : "", at: r.at });
  }
  return out.sort((a, b) => b.at - a.at).slice(0, SENT_MAX);
}

/** One more sent report, newest first; the same reference again isn't a second line. */
export function withSentReport(list: readonly SentReport[], r: SentReport): SentReport[] {
  if (list.some((x) => x.ref === r.ref)) return list.slice();
  return normalizeSentReports([r, ...list]);
}

/** Keeps a sent problem report's reference in this browser (Report a problem calls it). */
export function rememberSentReport(r: SentReport): void {
  writeStoredKey(SENT_REPORTS_KEY, withSentReport(normalizeSentReports(parseStored(readStoredKey(SENT_REPORTS_KEY)).value), r));
}

// ─────────────────────────── the list ───────────────────────────

export type MadeKind = "profile" | "post" | "comment" | "message" | "problem";

export type ReportRow = {
  id: string;
  kind: MadeKind;
  /** What was reported, in a sentence fragment ("Ava Chen's profile"). */
  what: string;
  /** The reported words, when there are some. */
  quote: string | null;
  href: string | null;
  /** null = this kind of report keeps no date. */
  at: number | null;
  reason: string | null;
  note: string | null;
  status: string;
  ref: string | null;
};

type ProfileReportLike = { id: string; by: string; who: string; reason: string; note: string; at: number };
type CommentLike = { id: string; authorId: string; body: string; createdAt: number };
type ConversationLike = {
  id: string;
  subject: { kind: "project"; name: string } | { kind: "post"; title: string };
  participants: { id: string; name: string }[];
};
type EntryLike = { id: string; conversationId: string; kind: string; from: string; text?: string };
type MessageReportLike = { id: string; by: string; conversationId: string; entryId?: string; reason: string; note: string; at: number };

export type MadeSources = {
  profiles: readonly ProfileReportLike[];
  posts: readonly string[];
  comments: readonly { postId: string; comments: readonly CommentLike[]; reported: readonly string[] }[];
  messages: { conversations: readonly ConversationLike[]; entries: readonly EntryLike[]; reports: readonly MessageReportLike[] };
  problems: readonly SentReport[];
};

export type MadeNames = {
  person: (id: string) => string | null;
  personHref: (id: string) => string | null;
  post: (postId: string) => { title: string; href: string } | null;
};

/** "me" in Messages and on profiles. */
const ME = "me";

const MESSAGE_REASONS: Record<string, string> = {
  spam: "Spam",
  scam: "Scam or asks to pay outside IDEEZA",
  harassment: "Harassment",
  other: "Something else",
};

const clip = (s: string, n = 160) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const noteOf = (s: string | undefined) => (s && s.trim() ? s.trim() : null);

export function reportsYouMade(src: MadeSources, names: MadeNames): ReportRow[] {
  const dated: ReportRow[] = [];
  const undated: ReportRow[] = [];

  for (const r of src.profiles) {
    if (r.by !== ME) continue;
    const name = names.person(r.who);
    dated.push({
      id: `profile:${r.id}`,
      kind: "profile",
      what: name ? `${name}'s profile` : "A profile that is no longer here",
      quote: null,
      href: names.personHref(r.who),
      at: r.at,
      reason: PROFILE_REASONS.find((x) => x.id === r.reason)?.label ?? null,
      note: noteOf(r.note),
      status: STATUS_RECEIVED,
      ref: null,
    });
  }

  for (const r of src.messages.reports) {
    if (r.by !== ME) continue;
    const c = src.messages.conversations.find((x) => x.id === r.conversationId);
    const entry = r.entryId ? src.messages.entries.find((e) => e.id === r.entryId && e.conversationId === r.conversationId) : null;
    const otherId = entry ? entry.from : c?.participants.find((p) => p.id !== ME)?.id;
    const other = (otherId && (c?.participants.find((p) => p.id === otherId)?.name || names.person(otherId))) || "someone";
    const about = c ? (c.subject.kind === "project" ? c.subject.name : c.subject.title) : null;
    const base = entry ? `A message from ${other}` : `A conversation with ${other}`;
    dated.push({
      id: `message:${r.id}`,
      kind: "message",
      what: about ? `${base} about ${about}` : base,
      quote: entry?.text?.trim() ? clip(entry.text.trim()) : null,
      href: c ? conversationHref(c.id) : null,
      at: r.at,
      reason: MESSAGE_REASONS[r.reason] ?? null,
      note: noteOf(r.note),
      status: STATUS_RECEIVED,
      ref: null,
    });
  }

  for (const p of src.problems) {
    dated.push({
      id: `problem:${p.ref}`,
      kind: "problem",
      what: p.title.trim() ? `Problem report: ${p.title.trim()}` : "Problem report",
      quote: null,
      href: null,
      at: p.at,
      reason: PROBLEM_KINDS.find((k) => k.value === p.kind)?.label ?? null,
      note: null,
      status: STATUS_SENT,
      ref: p.ref,
    });
  }

  for (const postId of src.posts) {
    const post = names.post(postId);
    undated.push({
      id: `post:${postId}`,
      kind: "post",
      what: post ? `The post “${post.title}”` : "A post that is no longer here",
      quote: null,
      href: post?.href ?? null,
      at: null,
      reason: null,
      note: null,
      status: STATUS_RECEIVED,
      ref: null,
    });
  }

  for (const thread of src.comments) {
    const post = names.post(thread.postId);
    for (const commentId of thread.reported) {
      const c = thread.comments.find((x) => x.id === commentId);
      undated.push({
        id: `comment:${thread.postId}:${commentId}`,
        kind: "comment",
        what: post ? `A comment on “${post.title}”` : "A comment on a post that is no longer here",
        quote: c?.body.trim() ? clip(c.body.trim()) : null,
        href: post ? `${post.href}#comment-${commentId}` : null,
        at: null,
        reason: null,
        note: null,
        status: STATUS_RECEIVED,
        ref: null,
      });
    }
  }

  return [...dated.sort((a, b) => (b.at ?? 0) - (a.at ?? 0)), ...undated];
}
