// The demo identity check, live. One `useSyncExternalStore` per key, the pattern `useDemoWallet` uses: a write in
// another tab (`storage`) or in this one (a dispatched event, so a same-tab
// write reaches its own readers too) shows without polling. Every write is
// reported to the storage banner (COR-93).

import * as React from "react";
import { reportWrite } from "../storage-status";
import { KYC_KEY, parseKyc, readKycRaw, resetKyc, verifiedKyc, writeKyc, type KycRecord } from "./kyc";

const EVENT = "ideeza:commerce-change";
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

/** The demo verification: `undefined` before hydration, then the record or null. */
export function useKyc(): KycRecord | null | undefined {
  const raw = React.useSyncExternalStore(subscribe, readKycRaw, () => SERVER);
  return React.useMemo(() => (raw === SERVER ? undefined : parseKyc(raw)), [raw]);
}

/** "Verify (demo)": stores the outcome only. `false`: the browser refused it. */
export function verifyKycDemo(): boolean {
  const ok = writeKyc(verifiedKyc(Date.now()));
  reportWrite(KYC_KEY, ok);
  notify();
  return ok;
}

export function resetKycDemo(): boolean {
  const ok = resetKyc();
  reportWrite(KYC_KEY, ok);
  notify();
  return ok;
}
