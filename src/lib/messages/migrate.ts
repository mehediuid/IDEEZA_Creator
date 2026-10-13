// The old "Get creator support" requests become conversations (spec §5): each
// `ideeza:market:support` record is the buyer's first message to you about its
// project, after a purchase context. `sourceId` keeps it to once. Pure.

import { createDirect, directKeyOf, conversationByKey, send } from "./rules";
import { ME, type MessagesData, type PersonId } from "./types";

export type SupportLike = { id: string; saleId: string; projectId: string; buyerId: PersonId; message: string; at: number };

/** The data with every unmigrated request added, or null when there is nothing to add. */
export function migrateSupport(
  data: MessagesData,
  support: readonly SupportLike[],
  o: { buyerName: (id: PersonId) => string; projectName: (id: string) => string; makerName: string; newId: (prefix: string) => string },
): MessagesData | null {
  const done = new Set(data.entries.flatMap((e) => (e.kind === "message" && e.sourceId ? [e.sourceId] : [])));
  const todo = [...support].filter((r) => !done.has(r.id) && r.message.trim()).sort((a, b) => a.at - b.at);
  if (!todo.length) return null;
  let next = data;
  for (const r of todo) {
    const subject = { kind: "project" as const, projectId: r.projectId, name: o.projectName(r.projectId) };
    const existing = conversationByKey(next, directKeyOf(subject, r.buyerId, ME));
    const conversation = existing
      ? existing
      : (() => {
          const made = createDirect(next, {
            id: o.newId("cnv_"),
            subject,
            from: { id: r.buyerId, name: o.buyerName(r.buyerId) },
            to: { id: ME, name: o.makerName },
            folder: "inbox",
            now: r.at,
          });
          next = made.data;
          return made.conversation;
        })();
    const sent = send(next, {
      conversationId: conversation.id,
      from: r.buyerId,
      draft: { text: r.message, files: [], cards: [] },
      context: { kind: "purchase", saleId: r.saleId },
      now: r.at,
      id: o.newId("msg_"),
      contextId: o.newId("ctx_"),
    });
    if (!sent.ok) continue;
    next = {
      ...sent.value.data,
      entries: sent.value.data.entries.map((e) => (e.id === sent.value.entry.id ? { ...sent.value.entry, sourceId: r.id } : e)),
    };
  }
  return next;
}
