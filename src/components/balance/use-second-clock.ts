"use client";

// The wall clock to the second, for the presale's countdowns and a
// purchase's "Claim in …" (the wallet's own clock ticks once a minute, which
// is plenty for a balance but not for a timer). 0 on the server.

import * as React from "react";

const SECOND = 1000;

function subscribe(onChange: () => void) {
  const t = window.setInterval(onChange, SECOND);
  return () => window.clearInterval(t);
}

export function useSecondClock(): number {
  return React.useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / SECOND) * SECOND,
    () => 0,
  );
}
