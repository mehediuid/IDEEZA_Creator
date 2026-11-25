"use client";

// The units made with Physical NFT copies in this browser (`UNITS_KEY`, lib/market/units.ts): a live read that
// follows this tab and another. A copy's Download files writes one unit (owner, 2026-11-25: "when the user
// downloads, the amount comes off their manufacturing units"; appendUnits); the log also holds the demo orders the
// planter adds.

import * as React from "react";
import { normalizeUnits, UNITS_KEY, type UnitsEntry } from "@/lib/market/units";

let cache: { raw: string | null; log: UnitsEntry[] } = { raw: null, log: [] };
const EMPTY: UnitsEntry[] = [];

/** The log as stored right now (a purchase's check reads it fresh). */
export function readUnitsLog(): UnitsEntry[] {
  return read();
}

function read(): UnitsEntry[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(UNITS_KEY);
  } catch {
    raw = null;
  }
  if (raw === cache.raw) return cache.log;
  let log: UnitsEntry[] = [];
  try {
    log = normalizeUnits(raw ? JSON.parse(raw) : []);
  } catch {
    log = [];
  }
  cache = { raw, log };
  return log;
}

const listeners = new Set<() => void>();

/** Adds one entry to the log; false when this browser couldn't keep it (nothing is then taken). */
export function appendUnits(entry: UnitsEntry): boolean {
  try {
    window.localStorage.setItem(UNITS_KEY, JSON.stringify([...read(), entry]));
  } catch {
    return false;
  }
  for (const l of listeners) l();
  return true;
}

function subscribe(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === UNITS_KEY) onChange();
  };
  listeners.add(onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useUnitsLog(): UnitsEntry[] {
  return React.useSyncExternalStore(subscribe, read, () => EMPTY);
}
