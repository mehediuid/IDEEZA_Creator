"use client";

// The phone's KYC levels 2 and 3, live (kyc-levels.ts): a write here or in
// another tab shows at once.

import * as React from "react";
import { reportWrite } from "../storage-status";
import { EMPTY_LEVELS, KYC_LEVELS_KEY, parseLevels, readLevelsRaw, writeLevels, type KycLevels } from "./kyc-levels";

const EVENT = "ideeza:kyc-levels-change";
const SERVER = "\u0000server";

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === KYC_LEVELS_KEY) onChange();
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** `undefined` until this browser's copy has been read. */
export function useKycLevels(): KycLevels | undefined {
  const raw = React.useSyncExternalStore(subscribe, readLevelsRaw, () => SERVER);
  return React.useMemo(() => (raw === SERVER ? undefined : parseLevels(raw)), [raw]);
}

/** One change to the record as stored now. `false`: the browser refused it. */
export function updateKycLevels(change: (l: KycLevels) => KycLevels): boolean {
  const before = parseLevels(readLevelsRaw());
  const next = change(before);
  if (next === before) return true;
  const ok = writeLevels(next);
  reportWrite(KYC_LEVELS_KEY, ok);
  window.dispatchEvent(new Event(EVENT));
  return ok;
}

/** Level 1 reset: the higher levels go with it. */
export function clearKycLevels(): boolean {
  return updateKycLevels(() => EMPTY_LEVELS);
}
