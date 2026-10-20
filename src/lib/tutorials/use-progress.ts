// The viewer's tutorial progress, live: one `useSyncExternalStore` on
// `ideeza:tutorials:progress`, the pattern the demo wallet uses. A write in
// this tab is announced with an event so its own readers update too; another
// tab's write arrives through `storage`.

import * as React from "react";
import { reportWrite } from "../storage-status";
import { TUTORIAL_PROGRESS_KEY, emptyProgress, normalizeProgress, type TutorialProgress } from "./progress";

const EVENT = "ideeza:tutorials-change";
const SERVER = "\u0000server";

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(TUTORIAL_PROGRESS_KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): TutorialProgress {
  if (!raw) return emptyProgress();
  try {
    return normalizeProgress(JSON.parse(raw));
  } catch {
    return emptyProgress();
  }
}

/** The progress, or `undefined` until the browser has been read (server render, first paint). */
export function useTutorialProgress(): TutorialProgress | undefined {
  const raw = React.useSyncExternalStore(subscribe, readRaw, () => SERVER);
  return React.useMemo(() => (raw === SERVER ? undefined : parse(raw)), [raw]);
}

/** Reads the stored progress fresh, applies `change` and writes it back. `false`: the browser refused it. */
export function updateProgress(change: (p: TutorialProgress) => TutorialProgress): boolean {
  if (typeof window === "undefined") return false;
  const next = change(parse(readRaw()));
  let ok = true;
  try {
    window.localStorage.setItem(TUTORIAL_PROGRESS_KEY, JSON.stringify(next));
  } catch {
    ok = false;
  }
  reportWrite(TUTORIAL_PROGRESS_KEY, ok);
  window.dispatchEvent(new Event(EVENT));
  return ok;
}
