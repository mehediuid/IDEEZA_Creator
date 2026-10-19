// Messages' shared types and limits (spec 2026-10-13-messages-design.md §4).
// People talk to people here; every record is local demo data in this browser.
// Types and constants only, relative imports.

/** "me" (the maker), a demo buyer ("buyer-mira"…), a team member ("ctb_…"), or an
 *  Innovations creator ("feed:<creatorId>"). */
export type PersonId = string;

export const ME: PersonId = "me";

export const MESSAGES_KEY = "ideeza:messages";
/** sessionStorage: who this tab acts as (demo only). */
export const ACTING_AS_KEY = "ideeza:messages:as";

export const TEXT_MAX = 2000;
export const COUNT_FROM = 1800;
export const FILES_MAX = 5;
export const FILE_BYTES_MAX = 10 * 1024 * 1024;
export const FILE_TYPES: readonly string[] = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
export const EDIT_WINDOW_MS = 15 * 60 * 1000;

export type Subject =
  | { kind: "project"; projectId: string; name: string }
  | { kind: "post"; slug: string; title: string };

export type ContextRef =
  | { kind: "listing" }
  | { kind: "purchase"; saleId: string }
  | { kind: "team" }
  | { kind: "post" };

export type Participant = { id: PersonId; name: string };

export type Folder = "inbox" | "requests";

export type MemberState = {
  folder: Folder;
  lastReadAt: number;
  archived: boolean;
  muted: boolean;
  declined: boolean;
};

export type ConversationKind = "direct" | "team";

export type Conversation = {
  id: string;
  kind: ConversationKind;
  key: string;
  subject: Subject;
  /** Direct: the two people. Team: the creator; members are read live from the project. */
  participants: Participant[];
  startedBy: PersonId;
  createdAt: number;
  lastAt: number;
  state: Record<string, MemberState>;
};

export type FileRef = { key: string; name: string; type: string; size: number };
export type CardRef = { kind: "project"; projectId: string; name: string };

export type MessageEntry = {
  id: string;
  conversationId: string;
  kind: "message";
  from: PersonId;
  at: number;
  text: string;
  files: FileRef[];
  cards: CardRef[];
  editedAt?: number;
  deletedAt?: number;
  /** The support request a migrated message came from. */
  sourceId?: string;
};

export type ContextEntry = {
  id: string;
  conversationId: string;
  kind: "context";
  from: PersonId;
  at: number;
  context: ContextRef;
};

export type Entry = MessageEntry | ContextEntry;

export type Block = { by: PersonId; who: PersonId; at: number };

export type ReportReason = "spam" | "scam" | "harassment" | "other";

/** A reported message as it was when it was reported: the reporter keeps reading it, and it
 *  stays with the report, whatever its sender edits or deletes afterwards. */
export type ReportEvidence = { from: PersonId; at: number; text: string; files: FileRef[]; cards: CardRef[] };

export type Report = {
  id: string;
  by: PersonId;
  conversationId: string;
  entryId?: string;
  reason: ReportReason;
  note: string;
  at: number;
  evidence?: ReportEvidence;
};

/** Who can start a conversation with someone (Settings › Profile & Share, D13): Anyone ·
 *  people they work with or who own a copy or hold a share · no one new. */
export type AllowNew = "everyone" | "known" | "nobody";

export type MessagesData = {
  v: 1;
  conversations: Conversation[];
  entries: Entry[];
  blocks: Block[];
  reports: Report[];
  settings: Record<string, { allowNew: AllowNew }>;
};

export const EMPTY_MESSAGES: MessagesData = {
  v: 1,
  conversations: [],
  entries: [],
  blocks: [],
  reports: [],
  settings: {},
};
