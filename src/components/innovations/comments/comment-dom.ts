"use client";

// The browser-side helpers the comments section shares: the live hash, the
// clock behind "2 hours ago", the session's sort, focus and scroll moves
// after a write, copying a link, and shrinking a photo before it is stored.

import * as React from "react";
import { SORTS, type CommentSort } from "@/lib/innovations/comments";
import { commentAnchor } from "@/lib/innovations/slug";

// ─────────────────────────── hooks ───────────────────────────

function subscribeHash(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

/** `location.hash`, live; "" on the server. */
export function useLocationHash(): string {
  return React.useSyncExternalStore(subscribeHash, () => window.location.hash, () => "");
}

/** Now, moved on once a minute, so "2 minutes ago" keeps up without a re-render per second. */
export function useNow(step = 60_000): number {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), step);
    return () => window.clearInterval(t);
  }, [step]);
  return now;
}

const SORT_KEY = "ideeza:innovations:comment-sort";
const SORT_EVENT = "ideeza:comment-sort";

function readSort(): CommentSort {
  try {
    const v = window.sessionStorage.getItem(SORT_KEY);
    return SORTS.find((s) => s.id === v)?.id ?? "top";
  } catch {
    return "top";
  }
}

function subscribeSort(onChange: () => void): () => void {
  window.addEventListener(SORT_EVENT, onChange);
  return () => window.removeEventListener(SORT_EVENT, onChange);
}

/** Top · Newest · Oldest, kept for the tab's session across every post (plan §7: the choice is
 *  remembered). Blocked storage still sorts, it just forgets on reload. */
export function useCommentSort(): [CommentSort, (next: CommentSort) => void] {
  const stored = React.useSyncExternalStore(subscribeSort, readSort, () => "top" as const);
  const [local, setLocal] = React.useState<CommentSort | null>(null);
  const set = React.useCallback((next: CommentSort) => {
    setLocal(next);
    try {
      window.sessionStorage.setItem(SORT_KEY, next);
    } catch {
      // Blocked site data: the local choice above stands for this visit.
    }
    window.dispatchEvent(new Event(SORT_EVENT));
  }, []);
  return [local ?? stored, set];
}

// ─────────────────────────── focus & scroll ───────────────────────────

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function commentEl(id: string): HTMLElement | null {
  return document.getElementById(commentAnchor(id));
}

/** Brings an element into view (smoothly unless the maker asked for calm) and focuses it there. */
export function revealAndFocus(el: HTMLElement | null, block: ScrollLogicalPosition = "nearest"): void {
  if (!el || !el.isConnected) return;
  el.scrollIntoView({ block, behavior: reduced() ? "auto" : "smooth" });
  el.focus({ preventScroll: true });
}

/** After the next paint: the comment itself, or one of its controls (`[data-part=…]`). */
export function focusCommentSoon(id: string, part?: "menu" | "reply", fallback?: () => HTMLElement | null): void {
  requestAnimationFrame(() => {
    const el = commentEl(id);
    const target = el && part ? (el.querySelector<HTMLElement>(`[data-part="${part}"]`) ?? el) : el;
    revealAndFocus(target ?? fallback?.() ?? null);
  });
}

// ─────────────────────────── clipboard ───────────────────────────

/** Copies `text`; the old execCommand route where the async clipboard is refused. Focus stays put. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Not a secure context, or permission refused: fall through.
  }
  const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.className = "fixed left-0 top-0 opacity-0";
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  ta.remove();
  active?.focus({ preventScroll: true });
  return ok;
}

// ─────────────────────────── photos ───────────────────────────

export const PHOTO_MAX_EDGE = 1280;
const PHOTO_QUALITY = 0.82;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("unreadable image"));
    img.src = src;
  });
}

/** A photo as a JPEG data URL no longer than 1280 px on its long edge, so a comment's photo stays
 *  small enough for this browser's storage. Rejects anything the browser can't decode. */
export async function downscalePhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const long = Math.max(img.naturalWidth, img.naturalHeight);
    if (!long) throw new Error("empty image");
    const scale = Math.min(1, PHOTO_MAX_EDGE / long);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    // JPEG has no transparency: a transparent PNG lands on white rather than black. Image data, not UI colour.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", PHOTO_QUALITY);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ─────────────────────────── ids & dates ───────────────────────────

export function newCommentId(): string {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

const FULL_DATE = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

/** "Oct 13, 2026, 12:02 PM", in the reader's own locale. */
export function fullDate(at: number): string {
  return FULL_DATE.format(at);
}
