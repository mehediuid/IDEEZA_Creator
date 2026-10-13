// Reads `ideeza:messages` (spec §4): every row is checked, and a row that isn't
// the shape is dropped, never repaired. Pure, relative imports.

import {
  EMPTY_MESSAGES,
  type Block,
  type CardRef,
  type ContextRef,
  type Conversation,
  type Entry,
  type FileRef,
  type MemberState,
  type MessagesData,
  type Participant,
  type Report,
  type ReportReason,
  type Subject,
} from "./types";

type Rec = Record<string, unknown>;

const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string";
const isId = (v: unknown): v is string => isStr(v) && v.length > 0;
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const optNum = (v: unknown): number | undefined => (isNum(v) ? v : undefined);

function subjectIn(v: unknown): Subject | null {
  if (!isRec(v)) return null;
  if (v.kind === "project" && isId(v.projectId) && isStr(v.name)) return { kind: "project", projectId: v.projectId, name: v.name };
  if (v.kind === "post" && isId(v.slug) && isStr(v.title)) return { kind: "post", slug: v.slug, title: v.title };
  return null;
}

export function contextIn(v: unknown): ContextRef | null {
  if (!isRec(v)) return null;
  if (v.kind === "listing" || v.kind === "team" || v.kind === "post") return { kind: v.kind };
  if (v.kind === "purchase" && isId(v.saleId)) return { kind: "purchase", saleId: v.saleId };
  return null;
}

function participantIn(v: unknown): Participant | null {
  return isRec(v) && isId(v.id) && isStr(v.name) ? { id: v.id, name: v.name } : null;
}

function memberIn(v: unknown): MemberState | null {
  if (!isRec(v)) return null;
  return {
    folder: v.folder === "requests" ? "requests" : "inbox",
    lastReadAt: isNum(v.lastReadAt) ? v.lastReadAt : 0,
    archived: v.archived === true,
    muted: v.muted === true,
    declined: v.declined === true,
  };
}

function conversationIn(v: unknown): Conversation | null {
  if (!isRec(v) || !isId(v.id) || !isId(v.key) || !isId(v.startedBy) || !isNum(v.createdAt) || !isNum(v.lastAt)) return null;
  if (v.kind !== "direct" && v.kind !== "team") return null;
  const subject = subjectIn(v.subject);
  if (!subject) return null;
  const participants = arr(v.participants).map(participantIn).filter((p): p is Participant => p !== null);
  if (v.kind === "direct" && participants.length !== 2) return null;
  const state: Record<string, MemberState> = {};
  if (isRec(v.state)) {
    for (const [id, raw] of Object.entries(v.state)) {
      const m = memberIn(raw);
      if (m) state[id] = m;
    }
  }
  return {
    id: v.id,
    kind: v.kind,
    key: v.key,
    subject,
    participants,
    startedBy: v.startedBy,
    createdAt: v.createdAt,
    lastAt: v.lastAt,
    state,
  };
}

function fileIn(v: unknown): FileRef | null {
  return isRec(v) && isId(v.key) && isStr(v.name) && isStr(v.type) && isNum(v.size)
    ? { key: v.key, name: v.name, type: v.type, size: v.size }
    : null;
}

function cardIn(v: unknown): CardRef | null {
  return isRec(v) && v.kind === "project" && isId(v.projectId) && isStr(v.name)
    ? { kind: "project", projectId: v.projectId, name: v.name }
    : null;
}

function entryIn(v: unknown): Entry | null {
  if (!isRec(v) || !isId(v.id) || !isId(v.conversationId) || !isId(v.from) || !isNum(v.at)) return null;
  if (v.kind === "context") {
    const context = contextIn(v.context);
    return context ? { id: v.id, conversationId: v.conversationId, kind: "context", from: v.from, at: v.at, context } : null;
  }
  if (v.kind !== "message" || !isStr(v.text)) return null;
  return {
    id: v.id,
    conversationId: v.conversationId,
    kind: "message",
    from: v.from,
    at: v.at,
    text: v.text,
    files: arr(v.files).map(fileIn).filter((f): f is FileRef => f !== null),
    cards: arr(v.cards).map(cardIn).filter((c): c is CardRef => c !== null),
    ...(optNum(v.editedAt) !== undefined ? { editedAt: v.editedAt as number } : {}),
    ...(optNum(v.deletedAt) !== undefined ? { deletedAt: v.deletedAt as number } : {}),
    ...(isId(v.sourceId) ? { sourceId: v.sourceId } : {}),
  };
}

function blockIn(v: unknown): Block | null {
  return isRec(v) && isId(v.by) && isId(v.who) && isNum(v.at) ? { by: v.by, who: v.who, at: v.at } : null;
}

const REASONS: ReadonlySet<string> = new Set<ReportReason>(["spam", "scam", "harassment", "other"]);

function reportIn(v: unknown): Report | null {
  if (!isRec(v) || !isId(v.id) || !isId(v.by) || !isId(v.conversationId) || !isNum(v.at)) return null;
  if (!isStr(v.reason) || !REASONS.has(v.reason)) return null;
  return {
    id: v.id,
    by: v.by,
    conversationId: v.conversationId,
    ...(isId(v.entryId) ? { entryId: v.entryId } : {}),
    reason: v.reason as ReportReason,
    note: isStr(v.note) ? v.note : "",
    at: v.at,
  };
}

/** The stored value as `MessagesData`. Anything unreadable reads as empty. */
export function normalizeMessages(raw: unknown): MessagesData {
  if (!isRec(raw)) return EMPTY_MESSAGES;
  const conversations: Conversation[] = [];
  const keys = new Set<string>();
  for (const c of arr(raw.conversations).map(conversationIn)) {
    if (!c || keys.has(c.key)) continue;
    keys.add(c.key);
    conversations.push(c);
  }
  const ids = new Set(conversations.map((c) => c.id));
  const settings: MessagesData["settings"] = {};
  if (isRec(raw.settings)) {
    for (const [id, s] of Object.entries(raw.settings)) {
      if (isRec(s) && (s.allowNew === "everyone" || s.allowNew === "known")) settings[id] = { allowNew: s.allowNew };
    }
  }
  return {
    v: 1,
    conversations,
    entries: arr(raw.entries)
      .map(entryIn)
      .filter((e): e is Entry => e !== null && ids.has(e.conversationId)),
    blocks: arr(raw.blocks).map(blockIn).filter((b): b is Block => b !== null),
    reports: arr(raw.reports).map(reportIn).filter((r): r is Report => r !== null),
    settings,
  };
}

/** Whether a stored value may be written over (an object); anything else is left alone. */
export const isMessagesShape = (v: unknown): boolean => isRec(v);
