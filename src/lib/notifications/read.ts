// The bell's read state (spec §5.6): the ids of the notices marked read, in
// `ideeza:notifications:read`, newest last. A notice is also read when its
// source says so (a conversation opened in Messages, a result seen in the
// Blog); those keep their own records, which this never rewrites. Pure.

import type { Notice } from "./types";

export const NOTICE_READ_KEY = "ideeza:notifications:read";
/** Enough for months of notices; the oldest keys go first. */
export const READ_KEYS_MAX = 1000;

/** A stored value → its keys (strings only, once each). */
export function decodeReadKeys(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((v): v is string => typeof v === "string" && v.length > 0))];
}

/** `current` plus `ids`, repeats dropped, at most READ_KEYS_MAX (the newest kept). */
export function addReadKeys(current: readonly string[], ids: readonly string[]): string[] {
  const have = new Set(current);
  const next = [...current, ...ids.filter((id, i) => !have.has(id) && ids.indexOf(id) === i)];
  return next.slice(-READ_KEYS_MAX);
}

export const isNoticeRead = (n: Notice, keys: ReadonlySet<string>) => !!n.read || keys.has(n.id);

/** What "Mark all as read" marks: every unread notice's id. */
export function unreadIdsOf(list: readonly Notice[], keys: ReadonlySet<string>): string[] {
  return list.filter((n) => !isNoticeRead(n, keys)).map((n) => n.id);
}
