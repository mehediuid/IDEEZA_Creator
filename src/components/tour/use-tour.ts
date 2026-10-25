// The Tour Guide's record, live: one `useSyncExternalStore` on `ideeza:tour`, the pattern the
// tutorials' progress uses. A write in this tab is announced with an event so its own readers
// update too; another tab's write arrives through `storage`.

import * as React from "react";
import { reportWrite } from "@/lib/storage-status";
import { TOUR_KEY, normalizeTour } from "@/lib/tour/state";
import type { TourRecord } from "@/lib/tour/types";

const EVENT = "ideeza:tour-change";
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
    return window.localStorage.getItem(TOUR_KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): TourRecord | null {
  if (!raw) return null;
  try {
    return normalizeTour(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** The record (`null`: none yet), or `undefined` until the browser has been read. */
export function useTourRecord(): TourRecord | null | undefined {
  const raw = React.useSyncExternalStore(subscribe, readRaw, () => SERVER);
  return React.useMemo(() => (raw === SERVER ? undefined : parse(raw)), [raw]);
}

/** Reads the stored record fresh, applies `change` and writes it back. `false`: the browser refused it. */
export function updateTour(change: (rec: TourRecord | null) => TourRecord): boolean {
  if (typeof window === "undefined") return false;
  const next = change(parse(readRaw()));
  let ok = true;
  try {
    window.localStorage.setItem(TOUR_KEY, JSON.stringify(next));
  } catch {
    ok = false;
  }
  reportWrite(TOUR_KEY, ok);
  window.dispatchEvent(new Event(EVENT));
  return ok;
}
