// Two facts the research host and the Tour Guide share, each written by one side only: the
// consent question is up (the Welcome waits until it is answered), and a tour is playing
// (recording pauses until it ends).

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

/** Written by the research host. */
export const consentAsking = signal();
/** Written by the Tour Guide: a chapter (the overview tour or one of its parts) is playing. */
export const tourPlaying = signal();

const never = () => false;

export function useSignal(s: Signal): boolean {
  return React.useSyncExternalStore(s.subscribe, s.get, never);
}
