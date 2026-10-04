"use client";

// Keyboard behaviour every modal dialog owes: focus moves into it when it
// opens, Tab and Shift+Tab stay inside it while it is open, and focus goes
// back to whatever opened it when it closes. The gate and the refine overlay
// had none of it — focus stayed on <body>, the page behind was 26 Tab stops
// away from the dialog's own controls, and closing dropped focus nowhere.
//
// A layer can also be covered: ModalFrame and Drawer pass `open && !covered`,
// so a confirm or a lightbox opened on top turns this off while the layer
// stays on screen. That isn't a close. The opener is captured once per open
// and kept under the cover, nothing on the page behind is focused, and when
// the cover goes the keyboard comes back to the control that had it inside
// the layer (the entry's Delete, the row's Generate). Only a real close hands
// focus to the opener.
//
// Which one it was is known only after this commit's effects have all run: a
// layer opening on top arms in the same passive flush, after this cleanup.
// So a layer that is still drawn, and not inert, decides a microtask later —
// covered if a layer armed after it is still armed, closed otherwise. One
// that has left the DOM, or gone inert (the spec sheet's exit), is closed at
// once.

import * as React from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Every armed layer, by the order it armed in. */
const armed: number[] = [];
let arming = 0;

type Held = {
  /** What had focus when the layer opened. */
  opener: HTMLElement | null;
  /** What had focus inside the layer when another covered it. */
  inside: HTMLElement | null;
};

export function useDialogFocus(
  open: boolean,
  container: React.RefObject<HTMLElement | null>,
  /** What to focus on open; the first focusable control when omitted. */
  initial?: React.RefObject<HTMLElement | null>,
) {
  // Outlives a cover: set on open, cleared only by a real close.
  const held = React.useRef<Held | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const seq = ++arming;
    armed.push(seq);
    const resumed = held.current;
    if (!resumed) {
      held.current = {
        opener: document.activeElement instanceof HTMLElement ? document.activeElement : null,
        inside: null,
      };
    }
    const frame = requestAnimationFrame(() => {
      const root = container.current;
      if (!root) return;
      if (resumed) {
        const back = resumed.inside;
        if (back && back.isConnected && root.contains(back)) {
          back.focus();
          return;
        }
        // The cover already handed focus back inside, on its own close.
        if (root.contains(document.activeElement)) return;
      }
      const first =
        initial?.current ?? root.querySelector<HTMLElement>(FOCUSABLE) ?? root;
      first.focus();
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const root = container.current;
      if (!root) return;
      const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (!items.length) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === firstEl || !root.contains(active))) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && (active === lastEl || !root.contains(active))) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    // Read at cleanup on purpose: null (or detached) is how a close that
    // unmounted the layer tells itself apart from a cover.
    const rootNow = () => container.current;
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      armed.splice(armed.indexOf(seq), 1);
      const root = rootNow();
      const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const close = () => {
        const opener = held.current?.opener ?? null;
        held.current = null;
        // Back to where the maker was — if it is still on the page.
        if (opener && document.contains(opener)) opener.focus();
      };
      if (!root || !root.isConnected || root.closest("[inert]")) {
        close();
        return;
      }
      queueMicrotask(() => {
        if (!held.current) return;
        if (armed.some((s) => s > seq)) {
          held.current.inside = focused && root.contains(focused) ? focused : null;
          return;
        }
        close();
      });
    };
  }, [open, container, initial]);
}

/**
 * Runs `run` once no modal dialog is open any more — after the last layer's
 * own focus return (a passive-effect cleanup) has run. The wallet dialog
 * stays open on Done after `request()` resolves, and whatever opened it may be
 * gone by then (a sold listing's Buy now, the listing form), so a caller that
 * moves focus to the page must wait for every layer, not just its own.
 * Returns a stop.
 */
export function whenDialogsClose(run: () => void): () => void {
  const open = () => document.querySelector('[role="dialog"][aria-modal="true"]') !== null;
  let timer: number | null = null;
  const observer = new MutationObserver(() => {
    if (!open()) fire();
  });
  const fire = () => {
    observer.disconnect();
    timer = window.setTimeout(() => requestAnimationFrame(run), 0);
  };
  if (!open()) fire();
  else observer.observe(document.body, { childList: true });
  return () => {
    observer.disconnect();
    if (timer !== null) window.clearTimeout(timer);
  };
}
