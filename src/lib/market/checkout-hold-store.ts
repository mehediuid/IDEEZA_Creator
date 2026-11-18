// The checkout holds, live (checkout-hold.ts holds the rules): `ideeza:market:checkout-holds`
// through the shared key store, so another tab sees a hold the moment it's written.
// - `holdCheckout(itemId)` writes one and hands back its release: the purchase calls it on
//   success, reject, close or error. Leaving the page releases it too; otherwise it lapses
//   after 10 minutes.
// - `useCheckoutHolds()` reads the live holds, again whenever a tab writes and once more when
//   the next one lapses. `others` leaves out this tab's own, which its own Buy already waits on.
// An unreadable key is left as it is (errata 37): no hold is written over it.

import * as React from "react";
import { parseStored, readStoredKey, storedUnreadable, subscribeStores, writeStoredKey } from "../key-store";
import {
  addHold,
  CHECKOUT_HOLDS_KEY,
  heldCount,
  liveHolds,
  newHold,
  nextLapse,
  releaseHold,
  type CheckoutHold,
} from "./checkout-hold";
import { randomId } from "./sales";

/** This tab's mark on the holds it writes. */
const TAB = typeof window === "undefined" ? "" : randomId("tab_");
const NONE = "[]";

function storedHolds(): unknown {
  return parseStored(readStoredKey(CHECKOUT_HOLDS_KEY)).value;
}

/** Holds `itemId` for this tab's checkout; returns the release (safe to call more than once). */
export function holdCheckout(itemId: string): () => void {
  if (typeof window === "undefined" || storedUnreadable(CHECKOUT_HOLDS_KEY, Array.isArray)) return () => {};
  const hold = newHold({ id: randomId("hold_"), itemId, tab: TAB, now: Date.now() });
  writeStoredKey(CHECKOUT_HOLDS_KEY, addHold(storedHolds(), hold, Date.now()));
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    window.removeEventListener("pagehide", release);
    if (!storedUnreadable(CHECKOUT_HOLDS_KEY, Array.isArray)) {
      writeStoredKey(CHECKOUT_HOLDS_KEY, releaseHold(storedHolds(), hold.id, Date.now()));
    }
  };
  window.addEventListener("pagehide", release);
  return release;
}

/** Re-reads on every store change, and once more as the next hold lapses. */
function subscribeHolds(onChange: () => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const arm = () => {
    clearTimeout(timer);
    const now = Date.now();
    const next = nextLapse(liveHolds(storedHolds(), now));
    timer = next === null ? undefined : setTimeout(changed, next - now + 20);
  };
  const changed = () => {
    arm();
    onChange();
  };
  const off = subscribeStores(changed);
  arm();
  return () => {
    off();
    clearTimeout(timer);
  };
}

const snapshot = () => JSON.stringify(liveHolds(storedHolds(), Date.now()));

export type CheckoutHolds = {
  /** Checkouts holding `itemId`, from any tab: the owner's view. */
  any: (itemId: string) => number;
  /** Checkouts holding `itemId` from other tabs: a buyer's view. */
  others: (itemId: string) => number;
};

export function useCheckoutHolds(): CheckoutHolds {
  const snap = React.useSyncExternalStore(subscribeHolds, snapshot, () => NONE);
  return React.useMemo(() => {
    const holds = JSON.parse(snap) as CheckoutHold[];
    return { any: (itemId) => heldCount(holds, itemId), others: (itemId) => heldCount(holds, itemId, TAB) };
  }, [snap]);
}
