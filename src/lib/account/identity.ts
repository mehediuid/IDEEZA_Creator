// Your legal name (Settings › Account, owner V1–V2, 2026-10-20): private, never
// shown on your profile. One value, read where it is used: an invoice names
// you by it when Billing details has no name (`invoiceNameOf`), and the
// identity check fills its name from `useIdentity` and saves what is typed
// there with `saveLegalName`, so the name is never kept twice.
// localStorage `ideeza:account:identity`, versioned and normalized on every
// read, through the shared key store so every reader agrees without a reload.
//
// Version 2 keeps only the legal name. A Phase 1 record (v1) gives its first
// and last name as the legal name; its gender, permanent address and shipping
// addresses are dropped on read (V2: a shipping address belongs to a
// physical-copy checkout, not to Settings). Relative imports only.

import * as React from "react";
import { parseStored, readStoredKey, storedUnreadable, useStoredKey, writeStoredKey, type WriteResult } from "../key-store";

export const IDENTITY_KEY = "ideeza:account:identity";

/** The identity check's own limit (commerce/kyc.ts KYC_NAME_MAX), so a saved name always fits it. */
export const LEGAL_NAME_MAX = 80;

export type Identity = {
  v: 2;
  /** As on your ID; "" when not given. */
  legalName: string;
};

export const EMPTY_IDENTITY: Identity = { v: 2, legalName: "" };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

const oneLine = (v: unknown): string => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");

export function normalizeIdentity(raw: unknown): Identity {
  if (!isObj(raw)) return EMPTY_IDENTITY;
  const given = oneLine(raw.legalName);
  const legacy = [oneLine(raw.firstName), oneLine(raw.lastName)].filter(Boolean).join(" ");
  return { v: 2, legalName: (given || legacy).slice(0, LEGAL_NAME_MAX).trim() };
}

/** The name an invoice prints under "Billed to": Billing details' name (a person or a company),
 *  else your legal name, else your profile name. */
export function invoiceNameOf(n: { billingName: string; legalName: string; profileName: string }): string {
  return n.billingName || n.legalName || n.profileName;
}

// ─────────────────────────── the store ───────────────────────────

export function readIdentity(): Identity {
  return normalizeIdentity(parseStored(readStoredKey(IDENTITY_KEY)).value);
}

/** Saves the legal name; refused (nothing written) when the stored record can't be read or the
 *  browser won't store it. */
export function saveLegalName(legalName: string): WriteResult {
  if (storedUnreadable(IDENTITY_KEY, isObj)) return { ok: false };
  return writeStoredKey(IDENTITY_KEY, normalizeIdentity({ legalName }));
}

export function useIdentity(): { hydrated: boolean; identity: Identity } {
  const { hydrated, raw } = useStoredKey(IDENTITY_KEY);
  const identity = React.useMemo(() => normalizeIdentity(parseStored(raw).value), [raw]);
  return { hydrated, identity };
}
