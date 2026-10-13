"use client";

// The account's payment method (User Panel V2 › Payment Method 41549:161519):
// which token a checkout starts on. Card and PayPal aren't on yet, so the one
// method is Crypto from the Demo wallet, and the choice left is the token —
// the design's "Default" badge. Buy credits and a plan's checkout open on it;
// either can still pay with the other token.

import * as React from "react";

export type PayToken = "USDT" | "IDZ";

const STORAGE_KEY = "ideeza:account:payment";
const FALLBACK: PayToken = "IDZ";
const listeners = new Set<() => void>();

function read(): PayToken {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const coin = raw ? (JSON.parse(raw) as { coin?: unknown }).coin : null;
    return coin === "USDT" || coin === "IDZ" ? coin : FALLBACK;
  } catch {
    return FALLBACK;
  }
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** Saves the default token; false when the browser refused the write. */
export function setDefaultToken(coin: PayToken): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ coin }));
  } catch {
    return false;
  }
  listeners.forEach((l) => l());
  return true;
}

/** The token a checkout opens on. */
export function useDefaultToken(): PayToken {
  return React.useSyncExternalStore(subscribe, read, () => FALLBACK);
}
