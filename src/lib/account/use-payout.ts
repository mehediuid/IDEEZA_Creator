"use client";

// Get Paid's record, live (lib/account/payout.ts): one `useSyncExternalStore`
// over `ideeza:account:payout` and the per-project payout requests from before
// Get Paid, so the record always reads with those folded in. A write in
// another tab (`storage`) or this one (a dispatched event) shows at once;
// every write is reported to the storage banner (COR-93).

import * as React from "react";
import { parsePayouts, PAYOUTS_KEY, readPayoutsRaw } from "../commerce/payout";
import { reportWrite } from "../storage-status";
import { mergeLegacy, parsePayout, PAYOUT_KEY, payoutNeedsScrub, readRaw, writePayout, type PayoutStore } from "./payout";

const EVENT = "ideeza:payout-change";
const SERVER = "\u0000server";
const SEP = "\u0001";

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === PAYOUT_KEY || e.key === PAYOUTS_KEY) onChange();
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

const snapshot = () => `${readRaw(PAYOUT_KEY) ?? ""}${SEP}${readPayoutsRaw() ?? ""}`;

function storeOf(snap: string): PayoutStore {
  const [own, legacy] = snap.split(SEP);
  return mergeLegacy(parsePayout(own || null), parsePayouts(legacy || null));
}

/** The record as stored now, the old requests folded in. */
export function readPayoutNow(): PayoutStore {
  return storeOf(snapshot());
}

/** `undefined` until this browser's copy has been read. */
export function usePayout(): PayoutStore | undefined {
  const snap = React.useSyncExternalStore(subscribe, snapshot, () => SERVER);
  return React.useMemo(() => (snap === SERVER ? undefined : storeOf(snap)), [snap]);
}

/** One change to the record as it is stored now. `false`: the browser refused it, and nothing changed. */
export function updatePayout(change: (s: PayoutStore) => PayoutStore): boolean {
  const before = readPayoutNow();
  const next = change(before);
  if (next === before) return true;
  const ok = writePayout(next);
  reportWrite(PAYOUT_KEY, ok);
  window.dispatchEvent(new Event(EVENT));
  return ok;
}

/** Writes the record back without the tax data an older version kept (V7); nothing when there is none. */
export function scrubPayout(): void {
  if (!payoutNeedsScrub(readRaw(PAYOUT_KEY))) return;
  reportWrite(PAYOUT_KEY, writePayout(readPayoutNow()));
  window.dispatchEvent(new Event(EVENT));
}
