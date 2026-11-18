// Earn Coin's two small stores, live: the demo admin's paused / blocked staking
// contracts (`staking.ts`) and the referral links and referrals
// (`referral.ts`). The same `useSyncExternalStore` pattern as the demo wallet
// (`use-demo-wallet.ts`): a write in this tab or another shows without polling.
// Everything that moves IDZ is in the demo wallet, not here.

import * as React from "react";
import { REFERRAL_KEY, emptyReferralData, normalizeReferralData, type ReferralData } from "./referral";
import { STAKE_ADMIN_KEY, normalizeStakeAdmin, type StakeAdmin } from "./staking";

const EVENT = "ideeza:earn-change";
const SERVER = "\u0000server";

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function useStored<T>(key: string, normalize: (raw: unknown) => T, empty: () => T): T | undefined {
  const raw = React.useSyncExternalStore(
    subscribe,
    () => readRaw(key),
    () => SERVER,
  );
  return React.useMemo(() => {
    if (raw === SERVER) return undefined;
    if (!raw) return empty();
    try {
      return normalize(JSON.parse(raw));
    } catch {
      return empty();
    }
  }, [raw, normalize, empty]);
}

function read<T>(key: string, normalize: (raw: unknown) => T): T {
  try {
    return normalize(JSON.parse(window.localStorage.getItem(key) ?? "null"));
  } catch {
    return normalize(null);
  }
}

/** `false`: the browser refused the write (storage full or blocked); nothing changed. */
function write(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event(EVENT));
    return true;
  } catch {
    return false;
  }
}

const emptyAdmin = (): StakeAdmin => ({ v: 1, status: {} });

/** The demo admin's contract states; `undefined` before hydration. */
export function useStakeAdmin(): StakeAdmin | undefined {
  return useStored(STAKE_ADMIN_KEY, normalizeStakeAdmin, emptyAdmin);
}

export function readStakeAdmin(): StakeAdmin {
  return read(STAKE_ADMIN_KEY, normalizeStakeAdmin);
}

export function writeStakeAdmin(next: StakeAdmin): boolean {
  return write(STAKE_ADMIN_KEY, next);
}

/** The referral links and referrals; `undefined` before hydration. */
export function useReferralData(): ReferralData | undefined {
  return useStored(REFERRAL_KEY, normalizeReferralData, emptyReferralData);
}

export function readReferralData(): ReferralData {
  return read(REFERRAL_KEY, normalizeReferralData);
}

export function writeReferralData(next: ReferralData): boolean {
  return write(REFERRAL_KEY, next);
}
