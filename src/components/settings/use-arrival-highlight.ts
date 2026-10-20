"use client";

// Arriving at /settings/<page>#<row> (from search, ⌘K or a link): bring the
// row into view and outline it once, so the eye lands on it. The row keeps
// its place in the tab order; nothing is focused for the reader.

import * as React from "react";

export const ARRIVED_ATTR = "data-arrived";
const HOLD_MS = 2400;

export function useArrivalHighlight() {
  React.useEffect(() => {
    let timer: number | undefined;
    const mark = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ block: "center" });
      el.setAttribute(ARRIVED_ATTR, "");
      window.clearTimeout(timer);
      timer = window.setTimeout(() => el.removeAttribute(ARRIVED_ATTR), HOLD_MS);
    };
    // After the page's own first render, so the row exists. (Not rAF: it
    // never fires in a hidden tab.)
    const first = window.setTimeout(mark, 0);
    window.addEventListener("hashchange", mark);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(timer);
      window.removeEventListener("hashchange", mark);
    };
  }, []);
}
