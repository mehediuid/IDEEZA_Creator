// The demo wallet and the active Explore buyer, live (Phase 2 spec §3.4,
// §3.5.3). One `useSyncExternalStore` on `ideeza:wallet:demo`, the same
// pattern `useProjectNetwork` (`lib/network/store.ts`) and `useProjectBrief`
// use: a write in another tab (`storage`) or this one (a dispatched event, so
// a same-tab write reaches its own reader too) shows without polling.

import * as React from "react";
import { ACTIVE_BUYER_KEY } from "../market/types";
import { DEMO_WALLET_KEY, defaultWallet, normalizeWallet, writeWallet } from "./demo-wallet";
import { activeBuyerOf, type DemoBuyer } from "./identities";
import type { DemoWallet } from "./types";

const EVENT = "ideeza:wallet-change";
const SERVER = "\u0000server";

function notify() {
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readWalletRaw(): string | null {
  try {
    return window.localStorage.getItem(DEMO_WALLET_KEY);
  } catch {
    return null;
  }
}

/**
 * The demo wallet, live. `undefined` before hydration, so a surface renders
 * a fixed-height skeleton rather than flashing "No wallet connected"
 * (P2-MINT-1's three states). A missing key still reads as the (unconnected)
 * default, once hydrated.
 */
export function useDemoWallet(): DemoWallet | undefined {
  const raw = React.useSyncExternalStore(subscribe, readWalletRaw, () => SERVER);
  return React.useMemo(() => {
    if (raw === SERVER) return undefined;
    if (!raw) return defaultWallet();
    try {
      return normalizeWallet(JSON.parse(raw));
    } catch {
      return defaultWallet();
    }
  }, [raw]);
}

/**
 * Writes the next wallet, then notifies this tab at once — a plain
 * `localStorage.setItem` only reaches *other* tabs' `storage` listeners.
 * `false` means the browser refused the write (P2-MINT-2's alert); the prior
 * state is kept either way, since nothing here retries.
 */
export function writeDemoWallet(next: DemoWallet): boolean {
  const ok = writeWallet(next);
  notify();
  return ok;
}

// ── Explore's active buyer (P2-MARKETPLACE-3) ───────────────────────────────

function readActiveBuyerRaw(): string | null {
  try {
    return window.localStorage.getItem(ACTIVE_BUYER_KEY);
  } catch {
    return null;
  }
}

/** Which demo buyer Explore is currently browsing as — Mira, until the visitor switches. */
export function useActiveBuyer(): { buyer: DemoBuyer; setActiveBuyer: (id: DemoBuyer["id"]) => void } {
  const raw = React.useSyncExternalStore(subscribe, readActiveBuyerRaw, () => null);
  const buyer = React.useMemo(() => activeBuyerOf(raw), [raw]);
  const setActiveBuyer = React.useCallback((id: DemoBuyer["id"]) => {
    try {
      window.localStorage.setItem(ACTIVE_BUYER_KEY, id);
    } catch {
      /* the switch just doesn't stick this write; the read stays whatever it was */
    }
    notify();
  }, []);
  return { buyer, setActiveBuyer };
}
