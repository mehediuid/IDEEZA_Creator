// The Message tab's own reading of the messages (mobile Figma "People · 2026
// update", MS-01…51), over the web's store and rules: the phone's addresses,
// a row's unread count, a thread's runs and day breaks, the photos a viewer
// pages through, the line a reply quotes, and the phone's outbox — a message
// that couldn't go stays on this phone as "Not sent" until Retry or Delete
// (Shared kit KIT-OF-03). Pure, relative imports.

import { conversationHref, startHref, type StartParams } from "./links";
import { contextLineOf, contextSentenceOf, FEED_PREFIX, feedPersonId } from "./people";
import { isUnread, stateOf } from "./rules";
import {
  type CardRef,
  type ContextRef,
  type Conversation,
  type Entry,
  type FileRef,
  type MessageEntry,
  type MessagesData,
  type PersonId,
} from "./types";

// ─────────────────────────── addresses ───────────────────────────

export const M_MESSAGES_HREF = "/m/messages";
export const M_REQUESTS_HREF = "/m/messages?tab=requests";

/** A web address as the phone's: "/creators/mira" → "/m/creators/mira". */
export function phoneHrefOf(webHref: string): string {
  return `/m${webHref}`;
}

export function mThreadHref(id: string, about?: ContextRef | null): string {
  return phoneHrefOf(conversationHref(id, { about }));
}

/** Where a profile's, a post's or a listing's Message goes: the thread, or a draft its first Send creates. */
export function mStartHref(p: StartParams): string {
  return phoneHrefOf(startHref(p));
}

/** Settings › Privacy & safety on the phone, opened at "Who can message you" or at Take a break
 *  (the web's `#message` and `#take-a-break`), and its Hidden words page. */
export const M_MESSAGE_SETTINGS_HREF = "/m/settings/privacy?open=message";
export const M_QUIET_MODE_HREF = "/m/settings/privacy?open=break";
export const M_HIDDEN_WORDS_HREF = "/m/settings/privacy/hidden-words";

/** Who a start link's `to` names. A Feed post's link may carry its creator's bare id ("c2"):
 *  that is the person "feed:c2", as the web's creator row writes it, so the draft finds the
 *  creator, their block and the conversation already open with them. */
export function startPersonIdOf(to: string, creatorIds: readonly string[]): PersonId {
  if (to.startsWith(FEED_PREFIX) || !creatorIds.includes(to)) return to;
  return feedPersonId(to);
}

// ─────────────────────────── words ───────────────────────────

type ContextInfo = Parameters<typeof contextLineOf>[1];

/** The context card's line, in the web's words; a post is a Feed post on the phone (no Innovations). */
export function phoneContextLineOf(c: ContextRef | null, info: ContextInfo = {}): string {
  return c?.kind === "post" ? "Shared to Feed" : contextLineOf(c, info);
}

/** A context line in the timeline ("About the listing"), the post one in the phone's words. */
export function phoneContextSentenceOf(c: ContextRef, info: ContextInfo = {}): string {
  return c.kind === "post" ? "About the Feed post" : contextSentenceOf(c, info);
}

/** The start card's words where the phone's Figma (MS-51b) has its own; the web's otherwise. */
export const START_NOTHING_BODY = "Open a profile, post or listing and tap Message.";
export const START_GONE_BODY = "It may have been deleted.";

/** Whether two instants fall on the same calendar day here. */
export function sameDay(a: number, b: number): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

// ─────────────────────────── the list ───────────────────────────

/** Messages from others since `person` last read the conversation (the row's count). */
export function unreadCountOf(data: MessagesData, c: Conversation, person: PersonId): number {
  if (!isUnread(data, c, person)) return 0;
  const read = stateOf(c, person).lastReadAt;
  return data.entries.filter((e) => e.conversationId === c.id && e.kind === "message" && e.from !== person && e.at > read).length;
}

/** Whether a conversation was ever about a listing (the relation reads "Asked about your listing"). */
export function askedListingOf(data: MessagesData, conversationId: string): boolean {
  return data.entries.some((e) => e.conversationId === conversationId && e.kind === "context" && e.context.kind === "listing");
}

/** The first name, for "Block Mira" and "Message from Mira". */
export function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

// ─────────────────────────── the thread ───────────────────────────

export const RUN_GAP_MS = 5 * 60 * 1000;

export type ThreadRow =
  | { kind: "day"; key: string; at: number }
  | { kind: "context"; key: string; entry: Extract<Entry, { kind: "context" }> }
  | { kind: "run"; key: string; from: PersonId; items: MessageEntry[] };

/** A day break before each new day, context lines as they are, and messages in runs (one sender, minutes apart). */
export function threadRowsOf(entries: readonly Entry[], gapMs = RUN_GAP_MS): ThreadRow[] {
  const rows: ThreadRow[] = [];
  let day = "";
  for (const e of entries) {
    const d = new Date(e.at).toDateString();
    if (d !== day) {
      day = d;
      rows.push({ kind: "day", key: `day-${e.id}`, at: e.at });
    }
    if (e.kind === "context") {
      rows.push({ kind: "context", key: e.id, entry: e });
      continue;
    }
    const last = rows[rows.length - 1];
    if (last?.kind === "run" && last.from === e.from && e.at - last.items[last.items.length - 1].at <= gapMs) last.items.push(e);
    else rows.push({ kind: "run", key: e.id, from: e.from, items: [e] });
  }
  return rows;
}

export type PhotoRef = { entryId: string; file: FileRef };

/** Every photo still in the conversation, oldest first: the viewer pages through them. */
export function photosOf(entries: readonly Entry[]): PhotoRef[] {
  const out: PhotoRef[] = [];
  for (const e of entries) {
    if (e.kind !== "message" || e.deletedAt !== undefined) continue;
    for (const f of e.files) if (f.type.startsWith("image/")) out.push({ entryId: e.id, file: f });
  }
  return out;
}

/** What a reply quotes: its sender and one line of what they wrote. */
export type Quote = { from: PersonId; line: string };

export function quoteLineOf(e: MessageEntry): string {
  if (e.deletedAt !== undefined) return "Message deleted";
  const text = e.text.split("\n")[0].trim();
  if (text) return text;
  if (e.files.some((f) => f.type.startsWith("image/"))) return "A photo";
  if (e.files.length) return "A file";
  return e.cards.length ? "A project" : "";
}

export function quoteOf(entries: readonly Entry[], entryId: string): Quote | null {
  const e = entries.find((x) => x.id === entryId);
  return e && e.kind === "message" ? { from: e.from, line: quoteLineOf(e) } : null;
}

// ─────────────────────────── the outbox ───────────────────────────

export const OUTBOX_KEY = "ideeza:m:outbox";

/** A message this phone couldn't send. Its files wait in the messages' file store under their own keys. */
export type OutboxItem = {
  id: string;
  conversationId: string;
  text: string;
  files: FileRef[];
  cards: CardRef[];
  context: ContextRef | null;
  replyTo?: string;
  at: number;
  /** Why it didn't go ("You're offline."). */
  reason: string;
};

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);
const isId = (v: unknown): v is string => typeof v === "string" && v.length > 0;

function fileIn(v: unknown): FileRef | null {
  return isRec(v) && isId(v.key) && typeof v.name === "string" && typeof v.type === "string" && typeof v.size === "number"
    ? { key: v.key, name: v.name, type: v.type, size: v.size }
    : null;
}

function cardIn(v: unknown): CardRef | null {
  return isRec(v) && v.kind === "project" && isId(v.projectId) && typeof v.name === "string"
    ? { kind: "project", projectId: v.projectId, name: v.name }
    : null;
}

function contextIn(v: unknown): ContextRef | null {
  if (!isRec(v)) return null;
  if (v.kind === "listing" || v.kind === "team" || v.kind === "post") return { kind: v.kind };
  return v.kind === "purchase" && isId(v.saleId) ? { kind: "purchase", saleId: v.saleId } : null;
}

/** The stored outbox; a row that isn't the shape is dropped. */
export function normalizeOutbox(raw: unknown): OutboxItem[] {
  if (!Array.isArray(raw)) return [];
  const out: OutboxItem[] = [];
  for (const v of raw) {
    if (!isRec(v) || !isId(v.id) || !isId(v.conversationId) || typeof v.text !== "string" || typeof v.at !== "number") continue;
    out.push({
      id: v.id,
      conversationId: v.conversationId,
      text: v.text,
      files: (Array.isArray(v.files) ? v.files : []).map(fileIn).filter((f): f is FileRef => f !== null),
      cards: (Array.isArray(v.cards) ? v.cards : []).map(cardIn).filter((c): c is CardRef => c !== null),
      context: contextIn(v.context),
      ...(isId(v.replyTo) ? { replyTo: v.replyTo } : {}),
      at: v.at,
      reason: typeof v.reason === "string" ? v.reason : "",
    });
  }
  return out;
}

/** Adds or replaces an item (a retry that failed again keeps its place). */
export function putOutbox(items: readonly OutboxItem[], item: OutboxItem): OutboxItem[] {
  return items.some((i) => i.id === item.id) ? items.map((i) => (i.id === item.id ? item : i)) : [...items, item];
}

export function dropOutbox(items: readonly OutboxItem[], id: string): OutboxItem[] {
  return items.filter((i) => i.id !== id);
}

/** One conversation's unsent messages, oldest first. */
export function outboxOf(items: readonly OutboxItem[], conversationId: string): OutboxItem[] {
  return items.filter((i) => i.conversationId === conversationId).sort((a, b) => a.at - b.at);
}
