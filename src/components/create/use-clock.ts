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
