// The Blog store — the local adapter (spec § Data). The index under `ideeza:blog`
// is read-modify-written on the freshest copy (the messages-store pattern), so a
// second tab never drops an article; a key that can't be read is never written
// over. Each body has its own key with a `rev`, so autosave rewrites one small
// value and a tab that fell behind is told instead of silently overwriting. A
// server adapter replaces this file and files.ts; the UI only calls these.

import * as React from "react";
import { notifyStores, parseStored, readStoredKey, storedUnreadable, useStoredKey, writeStoredKey, type WriteResult } from "../key-store";
import { reportWrite } from "../storage-status";
import { nextDecision, removeArticle, settleReviews } from "./article";
import { blogFileKeys, deleteBlogFiles } from "./files";
import { isBlogShape, isBodyShape, normalizeBlog, normalizeBody } from "./normalize";
import { BLOG_KEY, blogDocKey, blogLiveKey, type BlogData, type BlogDoc, type StoredBody } from "./types";

export function decodeBlog(raw: string | null): BlogData {
  return normalizeBlog(parseStored(raw).value);
}

export function readBlogNow(): BlogData {
  return decodeBlog(readStoredKey(BLOG_KEY));
}

function unreadableRaw(raw: string | null): boolean {
  if (raw === null) return false;
  const { value, unreadable } = parseStored(raw);
  return unreadable || !isBlogShape(value);
}

export type BlogStore = {
  /** False until this browser's copy has been read. */
  hydrated: boolean;
  data: BlogData;
  /** The stored index is present but can't be read: every write is refused. */
  unreadable: boolean;
};

export function useBlog(): BlogStore {
  const { hydrated, raw } = useStoredKey(BLOG_KEY);
  const data = React.useMemo(() => decodeBlog(raw), [raw]);
  return { hydrated, data, unreadable: unreadableRaw(raw) };
}

/** Applies `fn` to the freshest stored index and writes the result. `null` (or the same
 *  object) writes nothing and succeeds. */
export function updateBlog(fn: (data: BlogData) => BlogData | null): WriteResult {
  if (storedUnreadable(BLOG_KEY, isBlogShape)) return { ok: false };
  const current = readBlogNow();
  const next = fn(current);
  if (!next || next === current) return { ok: true };
  return writeStoredKey(BLOG_KEY, next);
}

const BASE36 = "0123456789abcdefghijklmnopqrstuvwxyz";

/** "art_" / "file_" + 10 random base-36 characters. */
export function newBlogId(prefix: "art_" | "file_"): string {
  let id = prefix;
  for (const b of crypto.getRandomValues(new Uint8Array(10))) id += BASE36[b % 36];
  return id;
}

// ─────────────────────────── bodies ───────────────────────────

export type BodyWhich = "doc" | "live";
const bodyKey = (id: string, which: BodyWhich) => (which === "doc" ? blogDocKey(id) : blogLiveKey(id));

export function readBody(id: string, which: BodyWhich): StoredBody {
  return normalizeBody(parseStored(readStoredKey(bodyKey(id, which))).value);
}

export function useBody(id: string | null, which: BodyWhich): { hydrated: boolean; body: StoredBody } {
  const { hydrated, raw } = useStoredKey(id ? bodyKey(id, which) : null);
  const body = React.useMemo(() => normalizeBody(parseStored(raw).value), [raw]);
  return { hydrated, body };
}

export type BodyWrite = { ok: true; rev: number } | { ok: false; conflict: boolean };

/** Saves a body as `baseRev + 1`. Refused as a conflict when the stored copy moved past
 *  `baseRev` (another tab saved), and refused when the key can't be read. */
export function writeBody(id: string, which: BodyWhich, doc: BlogDoc, baseRev: number): BodyWrite {
  const key = bodyKey(id, which);
  if (storedUnreadable(key, isBodyShape)) return { ok: false, conflict: false };
  const stored = readBody(id, which);
  if (stored.rev > baseRev) return { ok: false, conflict: true };
  const rev = baseRev + 1;
  const res = writeStoredKey(key, { rev, doc });
  return res.ok ? { ok: true, rev } : { ok: false, conflict: false };
}

/** Copies one body over the other (approval: draft → live; discard: live → draft). */
export function copyBody(id: string, from: BodyWhich, to: BodyWhich): WriteResult {
  const src = readBody(id, from);
  const dest = readBody(id, to);
  return writeStoredKey(bodyKey(id, to), { rev: dest.rev + 1, doc: src.doc });
}

function removeKey(key: string): void {
  try {
    window.localStorage.removeItem(key);
    reportWrite(key, true);
  } catch {
    reportWrite(key, false);
  }
}

/** Removes the article's bodies (its index row goes through `updateBlog`). */
export function removeBodies(id: string): void {
  removeKey(blogDocKey(id));
  removeKey(blogLiveKey(id));
  notifyStores();
}

/** Deletes an article everywhere: its index row, both bodies and every stored file. */
export async function deleteArticle(id: string): Promise<WriteResult> {
  const res = updateBlog((d) => removeArticle(d, id));
  if (!res.ok) return res;
  removeBodies(id);
  await deleteBlogFiles(await blogFileKeys(id));
  return res;
}

// ─────────────────────────── the demo review ───────────────────────────

/** Decides every review that is due (spec § Demo review) and copies approved bodies to
 *  their live key. Safe to call on every read: nothing due, nothing written. */
export function settleDueReviews(now: number = Date.now()): void {
  const data = readBlogNow();
  const due = nextDecision(data);
  if (due === null || due > now) return;
  let approved: string[] = [];
  const res = updateBlog((d) => {
    const r = settleReviews(d, now, (id) => readBody(id, "doc").doc);
    approved = r.approved;
    return r.data;
  });
  if (res.ok) for (const id of approved) copyBody(id, "doc", "live");
}

/** Settles due reviews now and again at the next decision time, while the app is open, so
 *  an outcome arrives about a minute after sending without a reload. Mount once (sidebar). */
export function useReviewClock(): void {
  const { hydrated, data } = useBlog();
  const due = hydrated ? nextDecision(data) : null;
  React.useEffect(() => {
    if (due === null) return;
    const wait = Math.max(0, due - Date.now());
    const t = window.setTimeout(() => settleDueReviews(), wait + 50);
    return () => window.clearTimeout(t);
  }, [due]);
}
