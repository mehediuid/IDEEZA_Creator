"use client";

// A clock that ticks once a second while `active`, for the elapsed time a
// render really has been running. A render gives no milestones, and the card
// used to invent them — a percentage that raced to 90 and then sat there for
// as long as the render took.

import * as React from "react";

export function useSecondClock(active: boolean): number {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

/** "42 s", "1 min 5 s" — how long something has been running. */
export function elapsedLabel(since: number, now: number): string {
  const s = Math.max(0, Math.floor((now - since) / 1000));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  return `${m} min ${s % 60} s`;
}

/** "just now", "12 min ago", "3 hr ago", or a short date — a past moment in
 *  words, moved here from image-turn.tsx's `formatRelative` so the rail's
 *  Activity list (chat-rail-redesign spec §2.5) can read it too. */
export function relativeLabel(ts: number, now: number): string {
  const delta = Math.max(0, now - ts);
  const sec = Math.floor(delta / 1000);
  if (sec < 45) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
