// Two facts the Tour Guide shares with the research host: a tour is playing (recording pauses
// until it ends), and a tour card is on screen (the notice steps aside meanwhile).

import * as React from "react";

type Signal = {
  get: () => boolean;
  set: (next: boolean) => void;
  subscribe: (onChange: () => void) => () => void;
};

function signal(): Signal {
  let value = false;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set(next) {
      if (next === value) return;
      value = next;
      listeners.forEach((l) => l());
    },
    subscribe(onChange) {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
  };
}

/** Written by the Tour Guide: a chapter (the overview tour or one of its parts) is playing. */
export const tourPlaying = signal();
/** Written by the Tour Guide: a chapter is playing, or "Tours live here" points at the sidebar,
 *  whose card sits where the notice does. */
export const tourCovering = signal();

const never = () => false;

export function useSignal(s: Signal): boolean {
  return React.useSyncExternalStore(s.subscribe, s.get, never);
}
