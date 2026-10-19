// What a person does in Messages (spec §5, §6), over the local store: send
// (creating the conversation on its first message), edit, delete, read, the
// member flags, block, report and the "who can start" setting. Files are
// stored before the text that names them, and removed again if the text
// write is refused.

import { deleteMessageFiles, putMessageFile } from "./files";
import { seedDemoMessages, type DemoSeedInput } from "./demo-seed";
import { migrateSupport, type SupportLike } from "./migrate";
import { MAKER_NAME } from "./people";
import {
  addReport,
  block,
  canStart,
  conversationByKey,
  createDirect,
  createTeam,
  directKeyOf,
  edit,
  fileError,
  markRead,
  patchMember,
  remove,
  send,
  setAllowNew,
  startRefusalOf,
  teamKeyOf,
  unblock,
  type StartPolicy,
} from "./rules";
import { newMessagesId, updateMessages } from "./store";
import type {
  AllowNew,
  CardRef,
  ContextRef,
  FileRef,
  MemberState,
  MessagesData,
  Participant,
  PersonId,
  ReportReason,
  Subject,
} from "./types";

export type ActionResult<T = null> = { ok: true; value: T } | { ok: false; reason: string };

export const STORAGE_FULL = "This browser's storage is full — your message wasn't sent.";
const UNREADABLE = "This browser's messages couldn't be read, so nothing was saved.";

/** A conversation that doesn't exist yet: the first Send creates it. */
export type NewConversation =
  | { kind: "direct"; subject: Subject; to: Participant }
  | { kind: "team"; projectId: string; projectName: string };

export function keyOfNew(n: NewConversation, from: PersonId): string {
  return n.kind === "team" ? teamKeyOf(n.projectId) : directKeyOf(n.subject, from, n.to.id);
}

/** Sends one message. `create` makes the conversation first when `conversationId` is null
 *  (or finds it, when another tab made it meanwhile). */
export async function sendMessage(o: {
  conversationId: string | null;
  create?: NewConversation;
  from: Participant;
  text: string;
  files: readonly File[];
  cards: CardRef[];
  context: ContextRef | null;
  teamIds?: readonly PersonId[];
  /** Ties and quiet mode for a first message's start check (Settings › Audience). */
  policy?: StartPolicy;
}): Promise<ActionResult<{ conversationId: string }>> {
  for (const f of o.files) {
    const err = fileError(f);
    if (err) return { ok: false, reason: err };
  }
  const conversationId = o.conversationId ?? newMessagesId("cnv_");
  const refs: FileRef[] = [];
  for (const f of o.files) {
    const key = newMessagesId("file_");
    const put = await putMessageFile({ key, conversationId, blob: f, createdAt: Date.now() });
    if (!put.ok) {
      await deleteMessageFiles(refs.map((r) => r.key));
      return { ok: false, reason: `Couldn't save "${f.name}" — this browser's storage is full.` };
    }
    refs.push({ key, name: f.name, type: f.type, size: f.size });
  }

  let failure: string | null = null;
  let landedIn = conversationId;
  const written = updateMessages((data) => {
    let next: MessagesData = data;
    let id = o.conversationId;
    if (!id) {
      if (!o.create) {
        failure = "This conversation is gone.";
        return null;
      }
      const existing = conversationByKey(next, keyOfNew(o.create, o.from.id));
      if (existing) id = existing.id;
      else if (o.create.kind === "team") {
        next = createTeam(next, {
          id: conversationId,
          projectId: o.create.projectId,
          projectName: o.create.projectName,
          creatorName: MAKER_NAME,
          now: Date.now(),
        }).data;
        id = conversationId;
      } else {
        const check = canStart(next, o.from.id, o.create.to.id, o.context ?? { kind: "post" }, o.policy);
        if (!check.ok) {
          failure = startRefusalOf(check.reason, o.create.to.name);
          return null;
        }
        next = createDirect(next, {
          id: conversationId,
          subject: o.create.subject,
          from: o.from,
          to: o.create.to,
          folder: check.folder,
          now: Date.now(),
        }).data;
        id = conversationId;
      }
    }
    landedIn = id;
    const sent = send(next, {
      conversationId: id,
      from: o.from.id,
      draft: { text: o.text, files: refs, cards: o.cards },
      context: o.context,
      now: Date.now(),
      id: newMessagesId("msg_"),
      contextId: newMessagesId("ctx_"),
      teamIds: o.teamIds,
    });
    if (!sent.ok) {
      failure = sent.reason;
      return null;
    }
    return sent.value.data;
  });
  if (failure || !written.ok) {
    await deleteMessageFiles(refs.map((r) => r.key));
    return { ok: false, reason: failure ?? STORAGE_FULL };
  }
  // A file stored under a new id that another tab beat us to stays findable: the refs carry their own keys.
  return { ok: true, value: { conversationId: landedIn } };
}

function apply(fn: (data: MessagesData) => MessagesData | null, failed = UNREADABLE): ActionResult {
  return updateMessages(fn).ok ? { ok: true, value: null } : { ok: false, reason: failed };
}

export function editMessage(entryId: string, by: PersonId, text: string): ActionResult {
  let failure: string | null = null;
  const r = apply((data) => {
    const out = edit(data, { entryId, by, text, now: Date.now() });
    if (!out.ok) {
      failure = out.reason;
      return null;
    }
    return out.value;
  }, "This browser's storage is full — your change wasn't saved.");
  return failure ? { ok: false, reason: failure } : r;
}

export async function deleteMessage(entryId: string, by: PersonId): Promise<ActionResult> {
  let failure: string | null = null;
  let keys: string[] = [];
  const r = apply((data) => {
    const out = remove(data, { entryId, by, now: Date.now() });
    if (!out.ok) {
      failure = out.reason;
      return null;
    }
    keys = out.value.fileKeys;
    return out.value.data;
  }, "This browser's storage is full — the message wasn't deleted.");
  if (failure) return { ok: false, reason: failure };
  if (r.ok) await deleteMessageFiles(keys);
  return r;
}

export function markConversationRead(conversationId: string, person: PersonId): void {
  updateMessages((data) => markRead(data, conversationId, person, Date.now()));
}

/** Mute, archive, accept a request (`folder: "inbox"`) or delete it (`declined: true`). */
export function setMember(conversationId: string, person: PersonId, patch: Partial<MemberState>): ActionResult {
  return apply((data) => patchMember(data, conversationId, person, patch));
}

export function blockPerson(by: PersonId, who: PersonId): ActionResult {
  return apply((data) => block(data, by, who, Date.now()));
}

export function unblockPerson(by: PersonId, who: PersonId): ActionResult {
  return apply((data) => unblock(data, by, who));
}

export function reportConversation(o: {
  by: PersonId;
  conversationId: string;
  entryId?: string;
  reason: ReportReason;
  note: string;
  alsoBlock: PersonId | null;
}): ActionResult {
  return apply((data) => {
    const at = Date.now();
    const reported = addReport(data, {
      id: newMessagesId("rep_"),
      by: o.by,
      conversationId: o.conversationId,
      ...(o.entryId ? { entryId: o.entryId } : {}),
      reason: o.reason,
      note: o.note,
      at,
    });
    return o.alsoBlock ? block(reported, o.by, o.alsoBlock, at) : reported;
  });
}

export function setAllowNewFor(person: PersonId, allowNew: AllowNew): ActionResult {
  return apply((data) => setAllowNew(data, person, allowNew));
}

let migrated = false;

/** Turns the old support requests into conversations, once per tab. */
export function migrateSupportOnce(
  support: readonly SupportLike[],
  names: { buyerName: (id: PersonId) => string; projectName: (id: string) => string },
): void {
  if (migrated || !support.length) return;
  migrated = true;
  updateMessages((data) =>
    migrateSupport(data, support, { ...names, makerName: MAKER_NAME, newId: newMessagesId }),
  );
}

/** Adds the demo conversations a first visit finds (demo-seed.ts); nothing once they are there. */
export function seedDemoMessagesOnce(input: Omit<DemoSeedInput, "makerName">): void {
  updateMessages((data) => seedDemoMessages(data, { ...input, makerName: MAKER_NAME }));
}
