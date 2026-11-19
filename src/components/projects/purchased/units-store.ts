"use client";

// The units made with Physical NFT copies in this browser (`UNITS_KEY`, lib/market/units.ts): a live read that
// follows this tab and another. The manufacturing flow that writes an order comes later; until then the log holds
// the demo orders the planter adds.

import * as React from "react";
import { normalizeUnits, UNITS_KEY, type UnitsEntry } from "@/lib/market/units";

let cache: { raw: string | null; log: UnitsEntry[] } = { raw: null, log: [] };
const EMPTY: UnitsEntry[] = [];

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

function subscribe(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === UNITS_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

export function useUnitsLog(): UnitsEntry[] {
  return React.useSyncExternalStore(subscribe, read, () => EMPTY);
}
