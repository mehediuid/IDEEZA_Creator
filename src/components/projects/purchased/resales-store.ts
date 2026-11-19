"use client";

// Copies sold on by their holders in this browser (`RESALES_KEY`, lib/market/resales.ts): a live read every screen
// follows at once, in this tab and in another; the one write a listing, a new price, taking it off sale or a
// purchase makes; and paying a sold listing out into the demo wallet.

import * as React from "react";
import { missingPayoutsOf, normalizeResales, RESALES_KEY, type Resale } from "@/lib/market/resales";
import { payeeOf } from "@/lib/tutorials/reward";
import { pushActivity, readWallet } from "@/lib/wallet/demo-wallet";
import { writeDemoWallet } from "@/lib/wallet/use-demo-wallet";

const listeners = new Set<() => void>();
let cache: { raw: string | null; resales: Resale[] } = { raw: null, resales: [] };
const EMPTY: Resale[] = [];

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(RESALES_KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): Resale[] {
  if (raw === cache.raw) return cache.resales;
  let resales: Resale[] = [];
  try {
    resales = normalizeResales(raw ? JSON.parse(raw) : []);
  } catch {
    resales = [];
  }
  cache = { raw, resales };
  return resales;
}

/** The list as stored right now (a write's check reads it fresh). */
export function readResales(): Resale[] {
  return parse(readRaw());
}

/** Writes the whole list; false when the browser refused it. */
export function writeResales(next: Resale[]): boolean {
  try {
    window.localStorage.setItem(RESALES_KEY, JSON.stringify(next));
  } catch {
    return false;
  }
  listeners.forEach((l) => l());
  return true;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === RESALES_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useResales(): Resale[] {
  return React.useSyncExternalStore(subscribe, readResales, () => EMPTY);
}

/** Pays one sold listing out, once: the price less royalty and fee to its seller's demo wallet, and on this
 *  browser's own project the royalty to its creator's account (when one is connected). Called after the buyer's
 *  own wallet line is written, so the two never race. */
export function payOut(resaleId: string): void {
  const r = readResales().find((x) => x.id === resaleId);
  if (!r || r.status !== "sold") return;
  const wallet = readWallet();
  const have = new Set(wallet.activity.map((a) => a.id));
  const lines = missingPayoutsOf([r], have, payeeOf(wallet));
  if (!lines.length) return;
  writeDemoWallet(lines.reduce((w, a) => pushActivity(w, a), wallet));
}
