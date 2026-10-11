"use client";

// The physical flow's make-and-ship plans, live (Build and Earn P1-3):
// `ideeza:project:edition-terms:<projectId>`, one plan per product, normalized
// on every read (sell-flow.ts). Written once, inside the listing request's
// commit, so a plan is only ever stored with a signed listing.

import * as React from "react";
import { parseStored, readStoredKey, useStoredKey, writeStoredKey } from "@/lib/key-store";
import { normalizeSellTerms, SELL_TERMS_KEY, withShipPlan, type SellTerms } from "@/lib/market/sell-flow";

const UNREADABLE = "This browser's listing terms couldn't be read, so nothing was changed.";
const STORAGE_FULL = "This browser's storage is full — nothing was saved.";

export function useSellTerms(projectId: string): SellTerms {
  const { raw } = useStoredKey(SELL_TERMS_KEY(projectId));
  return React.useMemo(() => normalizeSellTerms(parseStored(raw).value), [raw]);
}

/** Re-read, add this product's plan, write once. A key that can't be read is never overwritten. */
export function writeShipPlan(
  projectId: string,
  productId: string,
  note: string,
  at: number,
): { ok: true } | { ok: false; message: string } {
  const key = SELL_TERMS_KEY(projectId);
  const parsed = parseStored(readStoredKey(key));
  const v = parsed.value;
  if (parsed.unreadable || (v !== undefined && (typeof v !== "object" || v === null || Array.isArray(v)))) {
    return { ok: false, message: UNREADABLE };
  }
  const next = withShipPlan(normalizeSellTerms(v), productId, note, at);
  return writeStoredKey(key, next).ok ? { ok: true } : { ok: false, message: STORAGE_FULL };
}
