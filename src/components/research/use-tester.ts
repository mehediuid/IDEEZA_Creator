// The tester record (lib/research/tester.ts), live: one `useSyncExternalStore` on `ideeza:tester`,
// the pattern the Tour Guide's record uses (components/tour/use-tour.ts).

import * as React from "react";
import { reportWrite } from "@/lib/storage-status";
import { TESTER_KEY, arrive, normalizeTester, readTesterLink, type TesterRecord } from "@/lib/research/tester";

const EVENT = "ideeza:tester-change";
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
    return window.localStorage.getItem(TESTER_KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): TesterRecord | null {
  if (!raw) return null;
  try {
    return normalizeTester(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** The record (`null`: not a tester), or `undefined` until the browser has been read. */
export function useTesterRecord(): TesterRecord | null | undefined {
  const raw = React.useSyncExternalStore(subscribe, readRaw, () => SERVER);
  return React.useMemo(() => (raw === SERVER ? undefined : parse(raw)), [raw]);
}

/** Reads the stored record fresh, applies `change` and writes it back (`null` removes it). */
export function updateTester(change: (rec: TesterRecord | null) => TesterRecord | null): void {
  const prev = parse(readRaw());
  const next = change(prev);
  if (next === prev) return;
  let ok = true;
  try {
    if (next) window.localStorage.setItem(TESTER_KEY, JSON.stringify(next));
    else window.localStorage.removeItem(TESTER_KEY);
  } catch {
    ok = false;
  }
  reportWrite(TESTER_KEY, ok);
  window.dispatchEvent(new Event(EVENT));
}

/** This page load's tester link, applied before the app hydrates (instrumentation-client.ts), so
 *  the first render already knows who is testing: read any later, the previous tester's yes would
 *  start their tracking for one render. A new code asks; `?tester=off` forgets. */
export function applyTesterLink(): void {
  updateTester((prev) => arrive(prev, readTesterLink(window.location.search), Date.now()));
}
