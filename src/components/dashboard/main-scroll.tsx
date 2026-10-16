"use client";

// <main id="main-content"> is the shell's scroller, not the window. The
// browser's own scroll restoration only knows the window, and Next's Back and
// Forward do no scroll work, so a page came back wherever the page before had
// left <main>: the Parts list at 120 → a part → Back landed at 357. This is the
// shell's side of that (app-shell.tsx):
//
// - MainRouteEffects keeps <main>'s offset for each history entry and puts it
//   back on Back and Forward, and on a reload. A fresh visit is the router's:
//   it starts the new page at its top. After every navigation it also moves
//   focus to the new page's h1 (or <main>), so PageDown and Space scroll the
//   page instead of nothing, and a screen reader starts at the page's name.
// - useMainScrollPadding: a bar fixed or stuck over <main> reserves its height
//   as <main>'s scroll-padding, so a control taking focus is scrolled clear of
//   it instead of under it (WCAG 2.4.11).

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";

const mainEl = () => document.getElementById("main-content");
const here = () => window.location.pathname + window.location.search;

// ───────────────────────── scroll memory ─────────────────────────

/** The entry's id, in history.state beside Next's own fields. Per entry, not
 *  per URL: the same list visited twice keeps two places. */
const ENTRY = "__ixMain";
const STORE_KEY = "ideeza:main-scroll";
/** Entries kept in the tab's sessionStorage; the least recently written go first. */
const KEEP = 100;
/** How long a Back waits for its page to be drawn (a route the router fetches). */
const ARRIVAL_WAIT_MS = 10_000;
/** How long a restore keeps trying while the page fills in (a list read from storage). */
const SETTLE_MS = 2_000;

let offsets: Map<string, number> | null = null;
function store(): Map<string, number> {
  if (offsets) return offsets;
  offsets = new Map();
  try {
    const raw: unknown = JSON.parse(window.sessionStorage.getItem(STORE_KEY) ?? "[]");
    if (Array.isArray(raw)) {
      for (const pair of raw) {
        if (Array.isArray(pair) && typeof pair[0] === "string" && typeof pair[1] === "number") offsets.set(pair[0], pair[1]);
      }
    }
  } catch {
    // Blocked or corrupt: this tab starts with no places.
  }
  return offsets;
}

let persistTimer = 0;
function persistSoon() {
  window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    const map = store();
    while (map.size > KEEP) map.delete(map.keys().next().value as string);
    try {
      window.sessionStorage.setItem(STORE_KEY, JSON.stringify([...map]));
    } catch {
      // Storage blocked: places last until the tab reloads.
    }
  }, 250);
}

function entryId(state: unknown = window.history.state): string | null {
  const id = (state as Record<string, unknown> | null)?.[ENTRY];
  return typeof id === "string" ? id : null;
}

function ensureEntryId(): string {
  const have = entryId();
  if (have) return have;
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  // Next's fields ride along, and with them in it Next's patched replaceState
  // passes the call straight through; no URL, so the router is not involved.
  window.history.replaceState({ ...window.history.state, [ENTRY]: id }, "");
  return id;
}

/** A Back or Forward on its way: where <main> goes once the page at `url` is
 *  drawn (`top`, null when the entry kept no place), and the URL it left. */
let pending: { url: string; from: string | null; top: number | null; at: number } | null = null;
/** Ends the restore in progress: it ends itself, or the reader's own input
 *  ends it. `false` drops it without writing the offset (a Back is leaving). */
let stopSettling: ((record?: unknown) => void) | null = null;
/** The URL whose page <main> shows, as of the last route the shell drew. */
let shownUrl: string | null = null;

/** Writes <main>'s offset for the entry on screen — not while a Back is
 *  between entries, when <main> still holds the page being left. */
function remember() {
  const main = mainEl();
  // A Back whose page never came (a failed fetch) stops holding the writes.
  if (pending && performance.now() - pending.at > ARRIVAL_WAIT_MS) pending = null;
  if (!main || pending || stopSettling) return;
  const id = ensureEntryId();
  const map = store();
  map.delete(id);
  map.set(id, main.scrollTop);
  persistSoon();
}

/** Puts <main> at the pending offset, trying each frame while the page is
 *  still too short to reach it. Something else moving <main> meanwhile (the
 *  page putting back a place of its own, the reader) ends it: theirs wins. */
function settle() {
  const want = pending;
  pending = null;
  const main = mainEl();
  if (!want || !main) return;
  stopSettling?.(false);
  // No place kept for this entry: a page the reader never scrolled. A
  // different page starts at its top; the same page stays where it is.
  const top = want.top ?? (want.from === want.url ? null : 0);
  if (top === null) return;
  const until = performance.now() + SETTLE_MS;
  let put: number | null = null;
  let frame = 0;
  const stop = (record: unknown = true) => {
    window.cancelAnimationFrame(frame);
    for (const type of INPUTS) window.removeEventListener(type, stop, true);
    stopSettling = null;
    if (record !== false) remember();
  };
  const step = () => {
    if (put !== null && main.scrollTop !== put) return stop();
    main.scrollTop = top;
    put = main.scrollTop;
    if (Math.abs(put - top) <= 1 || performance.now() > until) return stop();
    frame = window.requestAnimationFrame(step);
  };
  for (const type of INPUTS) window.addEventListener(type, stop, true);
  stopSettling = stop;
  step();
}
const INPUTS = ["wheel", "touchstart", "keydown", "pointerdown"] as const;

let installed = false;
function install() {
  if (installed) return;
  installed = true;
  // Before the router's own listener (capture, on the event's own target), so
  // the target's place is read before anything is drawn.
  window.addEventListener(
    "popstate",
    (e) => {
      stopSettling?.(false);
      const id = entryId(e.state);
      pending = { url: here(), from: shownUrl, top: id === null ? null : (store().get(id) ?? null), at: performance.now() };
      // The page is already there: the same URL (a hash, a pushState of our
      // own), or a route the router drew inside this dispatch.
      if (shownUrl === pending.url) settle();
    },
    { capture: true },
  );
  // A click can navigate (a link, router.push): the place is written first.
  window.addEventListener("click", remember, { capture: true });
}

/** The shell's route effects on <main>: scroll memory and route focus. It
 *  renders nothing; it sits after <main>, in a Suspense of its own because of
 *  useSearchParams. */
export function MainRouteEffects() {
  const pathname = usePathname();
  const search = useSearchParams().toString();

  // Every route the shell draws, before it paints: a Back's page has arrived,
  // or another navigation overtook it. A new entry gets its id and offset at
  // once, so one the reader never scrolled (a tab a page pushed) still has a
  // place to come back to. An entry that has one keeps it: the router can draw
  // a Back's page before the popstate listener has run, and <main> then still
  // holds the offset of the page being left.
  React.useLayoutEffect(() => {
    shownUrl = here();
    if (!firstDrawDone) {
      firstDrawDone = true;
      // A reload, or Back into the app from another site: this document's
      // first page goes back to its place as well.
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      const id = nav?.type === "reload" || nav?.type === "back_forward" ? entryId() : null;
      const top = id === null ? undefined : store().get(id);
      if (top !== undefined) pending = { url: shownUrl, from: null, top, at: performance.now() };
    }
    if (pending?.url === shownUrl) return settle();
    pending = null;
    if (entryId() === null) remember();
  }, [pathname, search]);

  React.useEffect(() => {
    install();
    const main = mainEl();
    if (!main) return;
    main.addEventListener("scroll", remember, { passive: true });
    return () => {
      main.removeEventListener("scroll", remember);
      // The shell is going (an editor opens): <main> shows nothing now.
      shownUrl = null;
    };
  }, []);

  useRouteFocus(pathname);
  return null;
}
let firstDrawDone = false;

// ───────────────────────── route focus ─────────────────────────

/** The path focus last arrived at; null before this document's first page. */
let lastPath: string | null = null;

/** The path this document was loaded at: arriving there is a page load, not a navigation. */
function loadedPath(): string | null {
  const nav = performance.getEntriesByType("navigation")[0];
  try {
    return nav ? new URL(nav.name).pathname : null;
  } catch {
    return null;
  }
}

/** After a navigation (a new path, not a filter in the query), focus goes to
 *  the new page's h1, or <main> while it has none — unless the page has put
 *  focus inside itself (a composer, its own h1) or a dialog holds it. The
 *  link that was used is gone, or sits in the sidebar, where PageDown scrolls
 *  nothing. */
function useRouteFocus(pathname: string) {
  // A new shell (back from an editor) is an arrival even at the path it left.
  const fresh = React.useRef(true);
  React.useEffect(() => {
    const mounting = fresh.current;
    fresh.current = false;
    const arrived = lastPath === null ? pathname !== loadedPath() : lastPath !== pathname || mounting;
    lastPath = pathname;
    if (!arrived) return;
    const main = mainEl();
    if (!main) return;
    const active = document.activeElement;
    if (active && active !== document.body) {
      if (main.contains(active) || active.closest('[role="dialog"], [aria-modal="true"]')) return;
    }
    focusPage(main);
  }, [pathname]);
}

/** How long focus follows the page's h1 when a loading state gives way to the page. */
const FOLLOW_MS = 3_000;
let stopFollowing: (() => void) | null = null;

/** Focuses the page's h1 (or <main>), and keeps it there for a moment: a
 *  loading state's h1 (a Suspense fallback, as Innovations has) is replaced by
 *  the page's own a beat later, and focus fell to <body> with it. It follows
 *  only while nothing else has focus, and stops at the reader's first click. */
function focusPage(main: HTMLElement) {
  stopFollowing?.();
  const place = () => {
    const h1 = main.querySelector<HTMLElement>("h1");
    // Focusable from script only; globals.css drops its ring.
    if (h1 && !h1.hasAttribute("tabindex")) h1.tabIndex = -1;
    const target = h1 ?? main;
    target.focus({ preventScroll: true });
    return target;
  };
  let target = place();
  const follow = new MutationObserver(() => {
    if (target.isConnected) return;
    const active = document.activeElement;
    if (active && active !== document.body) return stop();
    target = place();
  });
  const timer = window.setTimeout(() => stop(), FOLLOW_MS);
  const stop = () => {
    follow.disconnect();
    window.clearTimeout(timer);
    window.removeEventListener("pointerdown", stop, true);
    stopFollowing = null;
  };
  follow.observe(main, { childList: true, subtree: true });
  window.addEventListener("pointerdown", stop, true);
  stopFollowing = stop;
}

// ───────────────────────── fixed and sticky bars ─────────────────────────

/** A ref for a bar fixed to <main>'s foot ("bottom") or stuck to its top
 *  ("top"): its height is <main>'s scroll-padding on that side, so focus and
 *  scrollIntoView keep controls clear of it. A bar that has shown keeps its
 *  room while it is hidden for a moment (display: none, as the post's bar is
 *  while the comment box has focus): it comes back in the same style change
 *  that moves focus on, before a new measurement could, and Tab from the box
 *  to the button beside it parked that button under the returning bar. A bar
 *  that has never shown (a phone bar on a desktop) reserves nothing. */
export function useMainScrollPadding(edge: "top" | "bottom"): React.RefCallback<HTMLElement> {
  return React.useCallback(
    (bar: HTMLElement | null) => {
      const main = mainEl();
      if (!bar || !main) return;
      const prop = edge === "top" ? "--main-obscured-top" : "--main-obscured-bottom";
      const measure = new ResizeObserver(() => {
        if (bar.offsetHeight > 0) main.style.setProperty(prop, `${bar.offsetHeight}px`);
      });
      measure.observe(bar);
      return () => {
        measure.disconnect();
        main.style.removeProperty(prop);
      };
    },
    [edge],
  );
}
