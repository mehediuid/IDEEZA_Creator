"use client";

// Leaving a page that sits on top of another (the preview over the editor, the
// reading view over whatever opened it) without making Back loop (F50): go back
// when the entry before this one is where we'd return to, otherwise replace this
// entry with the fallback. The Navigation API names the previous entry where the
// browser has it; elsewhere the preview replaces (never pushes) and the reading
// view goes back only when this tab has somewhere to go back to.

import type { useRouter } from "next/navigation";

type Router = ReturnType<typeof useRouter>;
type NavEntry = { url: string | null; index: number };
type NavigationLike = { entries(): NavEntry[]; currentEntry: NavEntry | null };

/** The path of the entry before this one, when the browser can say; undefined when it can't. */
export function previousPath(): string | null | undefined {
  const nav = (window as unknown as { navigation?: NavigationLike }).navigation;
  if (!nav?.currentEntry || typeof nav.entries !== "function") return undefined;
  const prev = nav.entries()[nav.currentEntry.index - 1];
  if (!prev?.url) return null;
  try {
    const u = new URL(prev.url);
    return u.origin === window.location.origin ? u.pathname : null;
  } catch {
    return null;
  }
}

/** The id tail a blog address ends in ("…-k3v9x2qa"), to tell one blog's pages from another's. */
export const tailOfPath = (path: string) => (path.split("/")[2] ?? "").split("-").pop() ?? "";

/** Back when the previous entry passes `cameFrom`, else replace with `fallback`. `orBack`: with
 *  no Navigation API, go back whenever this tab has history (the reading view's "where you came from"). */
export function leave(router: Router, fallback: string, cameFrom: (path: string) => boolean, orBack = false): void {
  const prev = previousPath();
  if (prev ? cameFrom(prev) : prev === undefined && orBack && window.history.length > 1) router.back();
  else router.replace(fallback);
}

/** Esc belongs to an open layer (a dialog, a menu, a list) before it belongs to the page. */
export function layerOpen(): boolean {
  return !!document.querySelector('[aria-modal="true"], [role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]');
}
