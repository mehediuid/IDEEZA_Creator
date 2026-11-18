// The phone's outbox (phone.ts, Shared kit KIT-OF-03): messages that couldn't
// go, kept on this phone with their files until Retry or Delete. One
// localStorage key, `ideeza:m:outbox`; the files wait in the messages' file
// store (files.ts) under their own keys and are copied again on Retry.

import * as React from "react";
import { parseStored, readStoredKey, useStoredKey, writeStoredKey, type WriteResult } from "../key-store";
import { deleteMessageFiles, getMessageFile, putMessageFile } from "./files";
import { dropOutbox, normalizeOutbox, OUTBOX_KEY, putOutbox, type OutboxItem } from "./phone";
import { newMessagesId } from "./store";
import type { FileRef } from "./types";

function readOutbox(): OutboxItem[] {
  return normalizeOutbox(parseStored(readStoredKey(OUTBOX_KEY)).value);
}

export function useOutbox(): OutboxItem[] {
  const { raw } = useStoredKey(OUTBOX_KEY);
  return React.useMemo(() => normalizeOutbox(parseStored(raw).value), [raw]);
}

/** Keeps a message that didn't go, with copies of its files; false when this phone can't hold it. */
export async function keepUnsent(item: Omit<OutboxItem, "files">, files: readonly File[]): Promise<boolean> {
  const refs: FileRef[] = [];
  for (const f of files) {
    const key = newMessagesId("file_");
    const put = await putMessageFile({ key, conversationId: `outbox:${item.conversationId}`, blob: f, createdAt: Date.now() });
    if (!put.ok) {
      await deleteMessageFiles(refs.map((r) => r.key));
      return false;
    }
    refs.push({ key, name: f.name, type: f.type, size: f.size });
  }
  const written = writeStoredKey(OUTBOX_KEY, putOutbox(readOutbox(), { ...item, files: refs }));
  if (!written.ok) await deleteMessageFiles(refs.map((r) => r.key));
  return written.ok;
}

export function updateUnsent(item: OutboxItem): WriteResult {
  return writeStoredKey(OUTBOX_KEY, putOutbox(readOutbox(), item));
}

/** Forgets an unsent message and its file copies. */
export async function forgetUnsent(item: OutboxItem): Promise<void> {
  writeStoredKey(OUTBOX_KEY, dropOutbox(readOutbox(), item.id));
  await deleteMessageFiles(item.files.map((f) => f.key));
}

/** The kept file copies as files again, for Retry; null when one is gone from this phone. */
export async function filesOfUnsent(item: OutboxItem): Promise<File[] | null> {
  const out: File[] = [];
  for (const f of item.files) {
    const blob = await getMessageFile(f.key);
    if (!blob) return null;
    out.push(new File([blob], f.name, { type: f.type }));
  }
  return out;
}
