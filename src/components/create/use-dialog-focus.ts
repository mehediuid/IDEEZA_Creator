"use client";

// Keyboard behaviour every modal dialog owes: focus moves into it when it
// opens, Tab and Shift+Tab stay inside it while it is open, and focus goes
// back to whatever opened it when it closes. The gate and the refine overlay
// had none of it — focus stayed on <body>, the page behind was 26 Tab stops
// away from the dialog's own controls, and closing dropped focus nowhere.

import * as React from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useDialogFocus(
  open: boolean,
  container: React.RefObject<HTMLElement | null>,
  /** What to focus on open; the first focusable control when omitted. */
  initial?: React.RefObject<HTMLElement | null>,
) {
  React.useEffect(() => {
    if (!open) return;
    const opener =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = requestAnimationFrame(() => {
      const root = container.current;
      if (!root) return;
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
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      // Back to where the maker was — if it is still on the page.
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [open, container, initial]);
}
