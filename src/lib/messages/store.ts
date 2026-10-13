// The messages store — the local adapter (spec §4, §7). One localStorage key,
// `ideeza:messages`, live across tabs through key-store's subscription. Every
// write reads the freshest stored value first, so two tabs (you and a demo
// buyer) never drop each other's messages. A key that can't be read is never
// written over. A server adapter replaces this file and actions.ts; the UI
// only calls `useMessages` and the actions.

import * as React from "react";
import { parseStored, readStoredKey, storedUnreadable, useStoredKey, writeStoredKey, type WriteResult } from "../key-store";
import { isMessagesShape, normalizeMessages } from "./normalize";
import { MESSAGES_KEY, type MessagesData } from "./types";

export function decodeMessages(raw: string | null): MessagesData {
  return normalizeMessages(parseStored(raw).value);
}

export function readMessagesNow(): MessagesData {
  return decodeMessages(readStoredKey(MESSAGES_KEY));
}

function unreadableRaw(raw: string | null): boolean {
  if (raw === null) return false;
  const { value, unreadable } = parseStored(raw);
  return unreadable || !isMessagesShape(value);
}

export type MessagesStore = {
  /** False until this browser's copy has been read. */
  hydrated: boolean;
  data: MessagesData;
  /** The stored messages are present but can't be read: every write is refused. */
  unreadable: boolean;
};

export function useMessages(): MessagesStore {
  const { hydrated, raw } = useStoredKey(MESSAGES_KEY);
  const data = React.useMemo(() => decodeMessages(raw), [raw]);
  return { hydrated, data, unreadable: unreadableRaw(raw) };
}

/** Applies `fn` to the freshest stored data and writes the result. `null` (or the same
 *  object) writes nothing and succeeds. */
export function updateMessages(fn: (data: MessagesData) => MessagesData | null): WriteResult {
  if (storedUnreadable(MESSAGES_KEY, isMessagesShape)) return { ok: false };
  const current = readMessagesNow();
  const next = fn(current);
  if (!next || next === current) return { ok: true };
  return writeStoredKey(MESSAGES_KEY, next);
}

const BASE36 = "0123456789abcdefghijklmnopqrstuvwxyz";

/** "cnv_" / "msg_" / "ctx_" / "file_" / "rep_" + 10 random base-36 characters. */
export function newMessagesId(prefix: string): string {
  let id = prefix;
  for (const b of crypto.getRandomValues(new Uint8Array(10))) id += BASE36[b % 36];
  return id;
}
