// Messages' rules (spec §5): who may start, which folder a conversation lands
// in, sending, edit and delete, blocks, unread and the conversation list. Every
// function takes the data and returns new data; ids and the clock come from the
// caller, so node:test runs them as they are. Settings › Audience (spec
// 2026-10-19 §5.10) adds who can message you (D13), quiet mode, hidden words on
// Requests, a reply that doesn't accept, and a reported message kept with its
// report. Pure, relative imports.

import { hasHiddenWord } from "../settings/audience";
import {
  EDIT_WINDOW_MS,
  FILE_BYTES_MAX,
  FILE_TYPES,
  FILES_MAX,
  ME,
  TEXT_MAX,
  type AllowNew,
  type CardRef,
  type ContextRef,
  type Conversation,
  type Entry,
  type FileRef,
  type Folder,
  type MemberState,
  type MessageEntry,
  type MessagesData,
  type Participant,
  type PersonId,
  type Report,
  type ReportEvidence,
  type Subject,
} from "./types";
import { formatDate, formatTime } from "../settings/dates";
import type { DateLocale } from "../settings/prefs";

export type Result<T> = { ok: true; value: T } | { ok: false; reason: string };

const DEFAULT_STATE: MemberState = { folder: "inbox", lastReadAt: 0, archived: false, muted: false, declined: false };

// ─────────────────────────── keys and members ───────────────────────────

export function subjectKeyOf(s: Subject): string {
  return s.kind === "project" ? `p:${s.projectId}` : `f:${s.slug}`;
}

export function subjectNameOf(s: Subject): string {
  return s.kind === "project" ? s.name.trim() || "Untitled project" : s.title;
}

export function directKeyOf(subject: Subject, a: PersonId, b: PersonId): string {
  const [x, y] = [a, b].sort();
  return `d|${subjectKeyOf(subject)}|${x}|${y}`;
}

export function teamKeyOf(projectId: string): string {
  return `t|${projectId}`;
}

export function conversationOf(data: MessagesData, id: string): Conversation | null {
  return data.conversations.find((c) => c.id === id) ?? null;
}

export function conversationByKey(data: MessagesData, key: string): Conversation | null {
  return data.conversations.find((c) => c.key === key) ?? null;
}

export function stateOf(c: Conversation, person: PersonId): MemberState {
  return c.state[person] ?? DEFAULT_STATE;
}

/** Direct: the two people. Team: you and the project's current team (`teamIds`). */
export function membersOf(c: Conversation, teamIds: readonly PersonId[] = []): PersonId[] {
  return c.kind === "direct" ? c.participants.map((p) => p.id) : [ME, ...teamIds];
}

export function isMember(c: Conversation, person: PersonId, teamIds: readonly PersonId[] = []): boolean {
  return membersOf(c, teamIds).includes(person);
}

/** The other person of a direct conversation; null for a team one. */
export function otherOf(c: Conversation, viewer: PersonId): Participant | null {
  if (c.kind !== "direct") return null;
  return c.participants.find((p) => p.id !== viewer) ?? null;
}

// ─────────────────────────── entries ───────────────────────────

export function entriesOf(data: MessagesData, conversationId: string): Entry[] {
  return data.entries
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.conversationId === conversationId)
    .sort((a, b) => a.e.at - b.e.at || a.i - b.i)
    .map(({ e }) => e);
}

export function latestContextOf(data: MessagesData, conversationId: string): ContextRef | null {
  let out: ContextRef | null = null;
  for (const e of entriesOf(data, conversationId)) if (e.kind === "context") out = e.context;
  return out;
}

export function sameContext(a: ContextRef | null, b: ContextRef | null): boolean {
  if (!a || !b) return a === b;
  if (a.kind !== b.kind) return false;
  return a.kind !== "purchase" || a.saleId === (b as { saleId: string }).saleId;
}

function lastMessageOf(data: MessagesData, conversationId: string): MessageEntry | null {
  const all = entriesOf(data, conversationId).filter((e): e is MessageEntry => e.kind === "message");
  return all[all.length - 1] ?? null;
}

// ─────────────────────────── who may start ───────────────────────────

export type BlockState = "none" | "byMe" | "byThem";

export function blockStateOf(data: MessagesData, viewer: PersonId, other: PersonId): BlockState {
  if (data.blocks.some((b) => b.by === viewer && b.who === other)) return "byMe";
  if (data.blocks.some((b) => b.by === other && b.who === viewer)) return "byThem";
  return "none";
}

export function allowNewOf(data: MessagesData, person: PersonId): AllowNew {
  return data.settings[person]?.allowNew ?? "everyone";
}

/** Whether `speaker` has written to `listener` in any direct conversation. */
export function hasWrittenTo(data: MessagesData, speaker: PersonId, listener: PersonId): boolean {
  const shared = new Set(
    data.conversations
      .filter((c) => c.kind === "direct" && c.participants.some((p) => p.id === speaker) && c.participants.some((p) => p.id === listener))
      .map((c) => c.id),
  );
  return data.entries.some((e) => e.kind === "message" && e.from === speaker && shared.has(e.conversationId));
}

/** A listing question, a purchase and a team are known relationships; so is anyone the recipient already wrote to. */
export function isKnown(data: MessagesData, from: PersonId, to: PersonId, context: ContextRef): boolean {
  return context.kind !== "post" || hasWrittenTo(data, to, from);
}

/** What the rules can't read from the messages alone (Settings › Audience): the ties between
 *  two people, and whether someone's quiet mode is on. */
export type StartPolicy = {
  /** One works on the other's project team, holds a share of it, or owns a copy. */
  tied?: (a: PersonId, b: PersonId) => boolean;
  /** Quiet mode: no new requests reach this person. */
  quiet?: (person: PersonId) => boolean;
};

/** Whether `person` already has a conversation with `other` in their Inbox (accepted or started). */
export function talksWith(data: MessagesData, person: PersonId, other: PersonId): boolean {
  return data.conversations.some(
    (c) =>
      c.kind === "direct" &&
      c.participants.some((p) => p.id === person) &&
      c.participants.some((p) => p.id === other) &&
      stateOf(c, person).folder === "inbox" &&
      !stateOf(c, person).declined,
  );
}

export type StartRefusal = "self" | "blocked" | "knownOnly" | "closed" | "quiet";

export type StartCheck = { ok: true; folder: Folder } | { ok: false; reason: StartRefusal };

export function canStart(data: MessagesData, from: PersonId, to: PersonId, context: ContextRef, policy: StartPolicy = {}): StartCheck {
  if (from === to) return { ok: false, reason: "self" };
  if (blockStateOf(data, from, to) !== "none") return { ok: false, reason: "blocked" };
  const allow = allowNewOf(data, to);
  if (allow === "nobody" && !talksWith(data, to, from)) return { ok: false, reason: "closed" };
  const known = isKnown(data, from, to, context) || policy.tied?.(from, to) === true;
  if (!known && allow === "known") return { ok: false, reason: "knownOnly" };
  if (!known && policy.quiet?.(to) === true) return { ok: false, reason: "quiet" };
  return { ok: true, folder: known ? "inbox" : "requests" };
}

/** The line an impossible start shows. This browser's account reads "You" to itself only. */
export function startRefusalOf(reason: StartRefusal, name: string): string {
  const mine = name === "You";
  const who = mine ? "This creator" : name;
  if (reason === "self") return "You can't start a conversation with yourself.";
  if (reason === "blocked") return `You can't message ${mine ? "this creator" : name}.`;
  if (reason === "closed") return `${who} only takes messages from people they already talk to.`;
  if (reason === "quiet") return `${who} has paused new message requests for now.`;
  return `${who} only takes messages from people they work with or who own a copy or hold a share.`;
}

// ─────────────────────────── creating ───────────────────────────

export function createDirect(
  data: MessagesData,
  o: { id: string; subject: Subject; from: Participant; to: Participant; folder: Folder; now: number },
): { data: MessagesData; conversation: Conversation } {
  const key = directKeyOf(o.subject, o.from.id, o.to.id);
  const existing = conversationByKey(data, key);
  if (existing) return { data, conversation: existing };
  const conversation: Conversation = {
    id: o.id,
    kind: "direct",
    key,
    subject: o.subject,
    participants: [o.from, o.to],
    startedBy: o.from.id,
    createdAt: o.now,
    lastAt: o.now,
    state: {
      [o.from.id]: { ...DEFAULT_STATE, lastReadAt: o.now },
      [o.to.id]: { ...DEFAULT_STATE, folder: o.folder },
    },
  };
  return { data: { ...data, conversations: [...data.conversations, conversation] }, conversation };
}

export function createTeam(
  data: MessagesData,
  o: { id: string; projectId: string; projectName: string; creatorName: string; now: number },
): { data: MessagesData; conversation: Conversation } {
  const key = teamKeyOf(o.projectId);
  const existing = conversationByKey(data, key);
  if (existing) return { data, conversation: existing };
  const conversation: Conversation = {
    id: o.id,
    kind: "team",
    key,
    subject: { kind: "project", projectId: o.projectId, name: o.projectName },
    participants: [{ id: ME, name: o.creatorName }],
    startedBy: ME,
    createdAt: o.now,
    lastAt: o.now,
    state: { [ME]: { ...DEFAULT_STATE, lastReadAt: o.now } },
  };
  return { data: { ...data, conversations: [...data.conversations, conversation] }, conversation };
}

// ─────────────────────────── sending ───────────────────────────

export type Draft = { text: string; files: FileRef[]; cards: CardRef[] };

export function draftError(d: Draft): string | null {
  const text = d.text.trim();
  if (text.length > TEXT_MAX) return `A message can be at most ${TEXT_MAX.toLocaleString("en-US")} characters.`;
  if (d.files.length > FILES_MAX) return `Attach at most ${FILES_MAX} files to one message.`;
  if (!text && !d.files.length && !d.cards.length) return "Write a message or attach something.";
  return null;
}

/** Why one picked file can't be attached, or null. */
export function fileError(f: { name: string; type: string; size: number }): string | null {
  if (!FILE_TYPES.includes(f.type)) return `"${f.name}" isn't a photo or a PDF.`;
  if (f.size > FILE_BYTES_MAX) return `"${f.name}" is over 10 MB.`;
  return null;
}

function patchConversation(data: MessagesData, id: string, fn: (c: Conversation) => Conversation): MessagesData {
  return { ...data, conversations: data.conversations.map((c) => (c.id === id ? fn(c) : c)) };
}

/** Sends a message, after a context entry when `context` differs from the conversation's latest. */
export function send(
  data: MessagesData,
  o: {
    conversationId: string;
    from: PersonId;
    draft: Draft;
    context: ContextRef | null;
    now: number;
    id: string;
    contextId: string;
    teamIds?: readonly PersonId[];
  },
): Result<{ data: MessagesData; entry: MessageEntry }> {
  const c = conversationOf(data, o.conversationId);
  if (!c) return { ok: false, reason: "This conversation is gone." };
  if (!isMember(c, o.from, o.teamIds)) return { ok: false, reason: "You're not in this conversation." };
  const other = otherOf(c, o.from);
  if (other && blockStateOf(data, o.from, other.id) !== "none") return { ok: false, reason: "You can't reply to this conversation." };
  const err = draftError(o.draft);
  if (err) return { ok: false, reason: err };
  const added: Entry[] = [];
  if (o.context && !sameContext(latestContextOf(data, c.id), o.context)) {
    added.push({ id: o.contextId, conversationId: c.id, kind: "context", from: o.from, at: o.now, context: o.context });
  }
  const entry: MessageEntry = {
    id: o.id,
    conversationId: c.id,
    kind: "message",
    from: o.from,
    at: o.now,
    text: o.draft.text.trim(),
    files: o.draft.files,
    cards: o.draft.cards,
  };
  added.push(entry);
  const next = patchConversation({ ...data, entries: [...data.entries, ...added] }, c.id, (conv) => {
    const state: Record<string, MemberState> = {};
    for (const [id, s] of Object.entries(conv.state)) state[id] = s.archived ? { ...s, archived: false } : s;
    // A reply is not an Accept: a request the sender holds stays in their Requests.
    state[o.from] = { ...stateOf(conv, o.from), lastReadAt: o.now, archived: false, declined: false };
    return { ...conv, lastAt: Math.max(conv.lastAt, o.now), state };
  });
  return { ok: true, value: { data: next, entry } };
}

// ─────────────────────────── edit and delete ───────────────────────────

export function canEdit(e: Entry, by: PersonId, now: number): boolean {
  return e.kind === "message" && e.from === by && e.deletedAt === undefined && now - e.at <= EDIT_WINDOW_MS;
}

function messageById(data: MessagesData, id: string): MessageEntry | null {
  const e = data.entries.find((x) => x.id === id);
  return e && e.kind === "message" ? e : null;
}

export function edit(data: MessagesData, o: { entryId: string; by: PersonId; text: string; now: number }): Result<MessagesData> {
  const e = messageById(data, o.entryId);
  if (!e || !canEdit(e, o.by, o.now)) return { ok: false, reason: "This message can't be edited any more." };
  const err = draftError({ text: o.text, files: e.files, cards: e.cards });
  if (err) return { ok: false, reason: err };
  const text = o.text.trim();
  if (text === e.text) return { ok: true, value: data };
  return {
    ok: true,
    value: { ...data, entries: data.entries.map((x) => (x.id === e.id ? { ...e, text, editedAt: o.now } : x)) },
  };
}

/** Deletes a message's content; `fileKeys` are the files the caller removes from storage. */
export function remove(
  data: MessagesData,
  o: { entryId: string; by: PersonId; now: number },
): Result<{ data: MessagesData; fileKeys: string[] }> {
  const e = messageById(data, o.entryId);
  if (!e || !canEdit(e, o.by, o.now)) return { ok: false, reason: "This message can't be deleted any more." };
  const gone: MessageEntry = { ...e, text: "", files: [], cards: [], deletedAt: o.now };
  const kept = new Set(data.reports.flatMap((r) => r.evidence?.files.map((f) => f.key) ?? []));
  return {
    ok: true,
    value: {
      data: { ...data, entries: data.entries.map((x) => (x.id === e.id ? gone : x)) },
      fileKeys: e.files.map((f) => f.key).filter((k) => !kept.has(k)),
    },
  };
}

// ─────────────────────────── a member's own flags ───────────────────────────

export function patchMember(data: MessagesData, conversationId: string, person: PersonId, patch: Partial<MemberState>): MessagesData {
  const c = conversationOf(data, conversationId);
  if (!c) return data;
  const was = stateOf(c, person);
  const now: MemberState = { ...was, ...patch };
  if (
    now.folder === was.folder &&
    now.lastReadAt === was.lastReadAt &&
    now.archived === was.archived &&
    now.muted === was.muted &&
    now.declined === was.declined &&
    c.state[person]
  ) {
    return data;
  }
  return patchConversation(data, conversationId, (conv) => ({ ...conv, state: { ...conv.state, [person]: now } }));
}

export function markRead(data: MessagesData, conversationId: string, person: PersonId, now: number): MessagesData {
  const c = conversationOf(data, conversationId);
  if (!c || stateOf(c, person).lastReadAt >= now) return data;
  return patchMember(data, conversationId, person, { lastReadAt: now });
}

// ─────────────────────────── blocks, reports, settings ───────────────────────────

export function block(data: MessagesData, by: PersonId, who: PersonId, now: number): MessagesData {
  if (by === who || data.blocks.some((b) => b.by === by && b.who === who)) return data;
  return { ...data, blocks: [...data.blocks, { by, who, at: now }] };
}

export function unblock(data: MessagesData, by: PersonId, who: PersonId): MessagesData {
  if (!data.blocks.some((b) => b.by === by && b.who === who)) return data;
  return { ...data, blocks: data.blocks.filter((b) => !(b.by === by && b.who === who)) };
}

/** Saves a report. A reported message is copied into it as it is now, so the reporter keeps
 *  reading it and the report keeps it, whatever its sender edits or deletes afterwards. */
export function addReport(data: MessagesData, report: Report): MessagesData {
  const e = report.entryId ? messageById(data, report.entryId) : null;
  const evidence: ReportEvidence | undefined =
    e && e.deletedAt === undefined ? { from: e.from, at: e.at, text: e.text, files: e.files, cards: e.cards } : undefined;
  const saved: Report = { ...report, note: report.note.trim().slice(0, 500), ...(evidence ? { evidence } : {}) };
  return { ...data, reports: [...data.reports, saved] };
}

/** The message `reader` reported, as it was then; null when they didn't report it. */
export function reportEvidenceOf(data: MessagesData, entryId: string, reader: PersonId): ReportEvidence | null {
  for (let i = data.reports.length - 1; i >= 0; i--) {
    const r = data.reports[i];
    if (r.by === reader && r.entryId === entryId && r.evidence) return r.evidence;
  }
  return null;
}

export function setAllowNew(data: MessagesData, person: PersonId, allowNew: AllowNew): MessagesData {
  if (allowNewOf(data, person) === allowNew && data.settings[person]) return data;
  return { ...data, settings: { ...data.settings, [person]: { allowNew } } };
}

// ─────────────────────────── unread and the list ───────────────────────────

export function isUnread(data: MessagesData, c: Conversation, person: PersonId): boolean {
  const read = stateOf(c, person).lastReadAt;
  return data.entries.some((e) => e.conversationId === c.id && e.kind === "message" && e.from !== person && e.at > read);
}

/** Who sees a conversation: its members, minus a recipient who deleted the request. */
export function visibleTo(c: Conversation, person: PersonId, teamIds: readonly PersonId[] = []): boolean {
  return isMember(c, person, teamIds) && !stateOf(c, person).declined;
}

export type Tab = "inbox" | "requests";
export type ListFilter = "all" | "unread" | "archived";

export type ListRow = {
  conversation: Conversation;
  other: Participant | null;
  unread: boolean;
  muted: boolean;
  archived: boolean;
  /** A request that uses a word the reader hides (shown only when asked for). */
  wordHidden: boolean;
  preview: string;
  lastAt: number;
};

export type Side = "mine" | "theirs";

type ListOpts = {
  tab: Tab;
  filter: ListFilter;
  subjectKey?: string | null;
  /** Your own projects and posts, or other creators'; needs `ownerOf`. */
  side?: Side | null;
  ownerOf?: (subject: Subject) => PersonId | null;
  q?: string;
  teamIdsOf: (projectId: string) => PersonId[];
  nameOf: (id: PersonId) => string;
  /** The reader's hidden words (Settings › Blocking): requests that use one leave the list… */
  hiddenWords?: readonly string[];
  /** …unless asked for. */
  showHidden?: boolean;
};

/** A request in `reader`'s Requests whose other person wrote a word the reader hides. */
export function requestHidden(data: MessagesData, c: Conversation, reader: PersonId, words: readonly string[]): boolean {
  if (!words.length || c.kind !== "direct" || stateOf(c, reader).folder !== "requests") return false;
  return data.entries.some(
    (e) => e.conversationId === c.id && e.kind === "message" && e.from !== reader && e.deletedAt === undefined && hasHiddenWord(e.text, words),
  );
}

function sideFor(subject: Subject, person: PersonId, ownerOf: (subject: Subject) => PersonId | null): Side {
  return ownerOf(subject) === person ? "mine" : "theirs";
}

function teamIdsFor(c: Conversation, teamIdsOf: (projectId: string) => PersonId[]): PersonId[] {
  return c.kind === "team" && c.subject.kind === "project" ? teamIdsOf(c.subject.projectId) : [];
}

function folderFor(c: Conversation, person: PersonId): Folder {
  return c.kind === "team" ? "inbox" : stateOf(c, person).folder;
}

/** The list row's last line: "You: …", "Sam: …" in a team, "Sent a file", "Message deleted". */
export function previewOf(e: MessageEntry | null, viewer: PersonId, team: boolean, nameOf: (id: PersonId) => string): string {
  if (!e) return "";
  const body = e.deletedAt !== undefined
    ? "Message deleted"
    : e.text
      ? e.text.split("\n")[0]
      : e.files.length
        ? "Sent a file"
        : "Shared a project";
  if (e.from === viewer) return `You: ${body}`;
  return team ? `${nameOf(e.from)}: ${body}` : body;
}

export function listFor(data: MessagesData, person: PersonId, o: ListOpts): ListRow[] {
  const q = (o.q ?? "").trim().toLowerCase();
  const rows: ListRow[] = [];
  for (const c of data.conversations) {
    const team = teamIdsFor(c, o.teamIdsOf);
    if (!visibleTo(c, person, team) || folderFor(c, person) !== o.tab) continue;
    if (o.subjectKey && subjectKeyOf(c.subject) !== o.subjectKey) continue;
    if (o.side && o.ownerOf && sideFor(c.subject, person, o.ownerOf) !== o.side) continue;
    const s = stateOf(c, person);
    const wordHidden = requestHidden(data, c, person, o.hiddenWords ?? []);
    if (wordHidden && !o.showHidden) continue;
    const unread = isUnread(data, c, person);
    if (o.filter === "archived" ? !s.archived : s.archived) continue;
    if (o.filter === "unread" && !unread) continue;
    const other = otherOf(c, person);
    if (q) {
      const hay = [
        other ? o.nameOf(other.id) : "",
        subjectNameOf(c.subject),
        ...data.entries.filter((e) => e.conversationId === c.id && e.kind === "message").map((e) => (e as MessageEntry).text),
      ];
      if (!hay.some((h) => h.toLowerCase().includes(q))) continue;
    }
    rows.push({
      conversation: c,
      other,
      unread,
      muted: s.muted,
      archived: s.archived,
      wordHidden,
      preview: previewOf(lastMessageOf(data, c.id), person, c.kind === "team", o.nameOf),
      lastAt: c.lastAt,
    });
  }
  return rows.sort((a, b) => b.lastAt - a.lastAt);
}

/** The sidebar badge (unread Inbox conversations, not archived or muted) and the Requests
 *  count, without the requests that use one of `hiddenWords`. */
export function countsFor(
  data: MessagesData,
  person: PersonId,
  teamIdsOf: (projectId: string) => PersonId[],
  hiddenWords: readonly string[] = [],
): { unread: number; requests: number } {
  let unread = 0;
  let requests = 0;
  for (const c of data.conversations) {
    if (!visibleTo(c, person, teamIdsFor(c, teamIdsOf))) continue;
    const s = stateOf(c, person);
    if (folderFor(c, person) === "requests") {
      if (!requestHidden(data, c, person, hiddenWords)) requests += 1;
    } else if (!s.archived && !s.muted && isUnread(data, c, person)) unread += 1;
  }
  return { unread, requests };
}

/** How many of `person`'s requests their hidden words keep out of Requests. */
export function hiddenRequestCount(data: MessagesData, person: PersonId, hiddenWords: readonly string[]): number {
  if (!hiddenWords.length) return 0;
  return data.conversations.filter((c) => visibleTo(c, person) && requestHidden(data, c, person, hiddenWords)).length;
}

/** The subjects of a person's conversations, for the Project filter: their own first, then other creators'. */
export function subjectsFor(
  data: MessagesData,
  person: PersonId,
  teamIdsOf: (projectId: string) => PersonId[],
  ownerOf: (subject: Subject) => PersonId | null,
): { key: string; name: string; side: Side }[] {
  const out = new Map<string, { key: string; name: string; side: Side }>();
  for (const c of data.conversations) {
    if (!visibleTo(c, person, teamIdsFor(c, teamIdsOf))) continue;
    const key = subjectKeyOf(c.subject);
    out.set(key, { key, name: subjectNameOf(c.subject), side: sideFor(c.subject, person, ownerOf) });
  }
  return [...out.values()].sort((a, b) => (a.side === b.side ? a.name.localeCompare(b.name) : a.side === "mine" ? -1 : 1));
}

// ─────────────────────────── time ───────────────────────────

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function startOfDay(at: number): number {
  const d = new Date(at);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

// With a `locale` (Settings › Language › Date & Time Formatting) the dates and
// the clock are written in that format; the relative words ("now", "5m",
// "Today") stay. Without one, the fixed English forms below.

/** The list's time: "now", "5m", "2h" today, "Mon" this week, "12 Oct" this year, "12 Oct 2025". */
export function shortTimeOf(at: number, now: number, locale?: DateLocale): string {
  const ms = Math.max(0, now - at);
  if (ms < 60_000) return "now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (startOfDay(at) === startOfDay(now)) return `${Math.floor(ms / 3_600_000)}h`;
  const d = new Date(at);
  if (startOfDay(now) - startOfDay(at) < 6 * 86_400_000) return DAYS[d.getDay()];
  const thisYear = d.getFullYear() === new Date(now).getFullYear();
  if (locale) return formatDate(at, locale, { style: thisYear ? "day" : "medium" });
  const md = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return thisYear ? md : `${md} ${d.getFullYear()}`;
}

/** A day divider: "Today", "Yesterday", "Mon, 12 Oct", "12 Oct 2025". */
export function dayLabelOf(at: number, now: number, locale?: DateLocale): string {
  const days = Math.round((startOfDay(now) - startOfDay(at)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  const d = new Date(at);
  const thisYear = d.getFullYear() === new Date(now).getFullYear();
  if (locale) return formatDate(at, locale, { style: thisYear ? "weekday" : "medium" });
  const md = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return thisYear ? `${DAYS[d.getDay()]}, ${md}` : `${md} ${d.getFullYear()}`;
}

/** "10:42 AM" under a group of bubbles. */
export function clockOf(at: number, locale?: DateLocale): string {
  if (locale) return formatTime(at, locale) ?? "";
  const d = new Date(at);
  const h = d.getHours();
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
