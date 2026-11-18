"use client";

// The screens this tab has moved through inside /m, so Back knows whether the
// previous history entry is still the app. `window.history.length` can't say:
// it counts pages from before the app (a search result, a chat link, the
// desktop page around the phone frame), so a deep link's Back used to leave
// IDEEZA, and a Back that pushed its parent made loops (project ⇄ My projects).
//
// The trail lives in sessionStorage (it survives a reload of the same tab) and
// follows the history itself: a pushState adds a screen, a replaceState swaps
// the top one, a popstate (Back, Forward) walks to where the browser went. A
// fresh page load starts a new trail, so Back on a deep link goes to the
// screen's parent, never out of the app.

import * as React from "react";
import { useRouter } from "next/navigation";

const KEY = "ideeza:m:trail";
const MAX = 50;

function read(): string[] {
  try {
    const v: unknown = JSON.parse(sessionStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function write(trail: string[]): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(trail.slice(-MAX)));
  } catch {
    // Storage refused: Back falls back to each screen's parent.
  }
}

const here = () => window.location.pathname + window.location.search;
const inApp = (path: string) => path === "/m" || path.startsWith("/m/") || path.startsWith("/m?");

/** How this screen was reached: Back (or Forward) restores what it had open; anything else starts clean. */
let lastMove: "load" | "push" | "pop" = "load";

function pushed(path: string) {
  lastMove = "push";
  const t = read();
  if (t[t.length - 1] !== path) write([...t, path]);
}

function replaced(path: string) {
  const t = read();
  write([...t.slice(0, -1), path]);
}

function popped(path: string) {
  lastMove = "pop";
  const t = read();
  if (t[t.length - 2] === path) return write(t.slice(0, -1));
  const at = t.lastIndexOf(path);
  write(at >= 0 ? t.slice(0, at + 1) : [...t, path]);
}

/** A fresh document: a reload keeps the trail, Back/Forward into it walks it, anything else starts over. */
function arrived(path: string) {
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  const t = read();
  if (nav?.type === "reload" && t[t.length - 1] === path) return;
  if (nav?.type === "back_forward" && t.includes(path)) return popped(path);
  write([path]);
}

let installed = false;

/** Mounted once by the /m root: starts following the history. */
export function useNavTrail(): void {
  React.useEffect(() => {
    if (installed) return;
    installed = true;
    arrived(here());
    const h = window.history;
    const push = h.pushState;
    const replace = h.replaceState;
    h.pushState = function (this: History, ...args: Parameters<History["pushState"]>) {
      const before = here();
      push.apply(this, args);
      const after = here();
      if (after !== before && inApp(after)) pushed(after);
    };
    h.replaceState = function (this: History, ...args: Parameters<History["replaceState"]>) {
      const before = here();
      replace.apply(this, args);
      const after = here();
      if (after !== before && inApp(after)) replaced(after);
    };
    window.addEventListener("popstate", () => {
      if (inApp(here())) popped(here());
    });
    // The Navigation API says what kind of move it is before the router reacts (popstate can come
    // after the new screen has mounted), so a screen reached by Back knows it at once.
    const nav = (window as Window & { navigation?: EventTarget }).navigation;
    nav?.addEventListener("navigate", (e) => {
      const kind = (e as Event & { navigationType?: string }).navigationType;
      if (kind === "traverse") lastMove = "pop";
      else if (kind === "push") lastMove = "push";
    });
    // Installed for the life of the page: Next.js wraps these too, and unwrapping would drop its layer.
  }, []);
}

const UI_KEY = "ideeza:m:open:";

/**
 * What a screen has open (a layer, a sheet), kept across a trip away and back, as a phone app
 * keeps its stack (owner 2026-11-15: Close on Generate video lost the Add to marketplace sheet the
 * maker came from). Starts at `initial`; once the screen mounts it takes back what it had open if
 * it was reached by Back, and forgets it otherwise. Remembered per path, in this tab only. `key`
 * is unique within the screen; the value is plain data (JSON).
 */
export function useBackState<T>(key: string, initial: T): [T, (value: T) => void] {
  const [value, setValue] = React.useState<T>(initial);
  const store = React.useRef<string | null>(null);
  React.useEffect(() => {
    const id = `${UI_KEY}${window.location.pathname}:${key}`;
    store.current = id;
    try {
      const raw = sessionStorage.getItem(id);
      // Restoring what this screen had open when it was left: a one-time sync from storage.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (lastMove === "pop" && raw !== null) setValue(JSON.parse(raw) as T);
      else sessionStorage.removeItem(id);
    } catch {
      // Storage refused: the screen opens clean, as before.
    }
  }, [key]);
  const set = React.useCallback((next: T) => {
    setValue(next);
    const id = store.current;
    if (!id) return;
    try {
      sessionStorage.setItem(id, JSON.stringify(next));
    } catch {
      // Storage refused: nothing to restore on the way back.
    }
  }, []);
  return [value, set];
}

/** True when the previous history entry is a screen of this app. */
export function canGoBack(): boolean {
  return read().length > 1;
}

/** Back: the previous screen when there is one in the app, else `parent` in place of this one.
 *  Never pushes, so Back can't loop. For a hand-made header's ←; TopBar uses it. */
export function useGoBack(parent = "/m"): () => void {
  const router = useRouter();
  return React.useCallback(() => {
    if (canGoBack()) router.back();
    else router.replace(parent);
  }, [router, parent]);
}
