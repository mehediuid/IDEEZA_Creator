"use client";

import * as React from "react";

/** Whether a media query matches now, kept in step with it (false on the server). */
export function useMedia(query: string): boolean {
  return React.useSyncExternalStore(
    (on) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", on);
      return () => mq.removeEventListener("change", on);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Below the `md` breakpoint: the publish step is a bottom sheet there. */
export const NARROW = "(max-width: 767.98px)";
