"use client";

// Billing details (Settings › Plan & pricing › Billing history, spec §5.11):
// the name or company, tax ID, address and billing email every invoice prints
// under "Billed to" (credits/invoice-view.tsx). One versioned record in this
// browser, `ideeza:account:billing`. Reading never throws: a missing or broken
// record reads as empty details, a field that isn't valid is dropped alone.
//
// An invoice is drawn from the payment each time it is opened, so it prints
// the details as they are now, not as they were on the day of the payment.

import * as React from "react";

export const BILLING_KEY = "ideeza:account:billing";
const EVENT = "ideeza:billing-change";

export interface BillingDetails {
  v: 1;
  /** A person's or a company's name, as the invoice should name the payer. */
  name: string;
  /** VAT, GST or EIN, as written. */
  taxId: string;
  /** One or more lines. */
  address: string;
  email: string;
}

export type BillingFields = Omit<BillingDetails, "v">;

export const LIMITS = { name: 120, taxId: 40, address: 400, email: 254 } as const;

export const EMPTY_BILLING: BillingDetails = Object.freeze({ v: 1, name: "", taxId: "", address: "", email: "" }) as BillingDetails;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const oneLine = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");

function lines(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .join("\n")
    .slice(0, max);
}

function email(v: unknown): string {
  const e = oneLine(v, LIMITS.email).toLowerCase();
  return EMAIL.test(e) ? e : "";
}

/** Any stored value → complete details. */
export function normalizeBilling(raw: unknown): BillingDetails {
  const r = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return {
    v: 1,
    name: oneLine(r.name, LIMITS.name),
    taxId: oneLine(r.taxId, LIMITS.taxId),
    address: lines(r.address, LIMITS.address),
    email: email(r.email),
  };
}

export function isEmptyBilling(d: BillingFields): boolean {
  return !d.name && !d.taxId && !d.address && !d.email;
}

/** What is wrong with a typed form, by field; empty when it can be saved. Every field is optional. */
export function billingErrors(f: BillingFields): Partial<Record<keyof BillingFields, string>> {
  const out: Partial<Record<keyof BillingFields, string>> = {};
  const tooLong = (k: keyof BillingFields) => {
    if (f[k].trim().length > LIMITS[k]) out[k] = `Use ${LIMITS[k]} characters or fewer`;
  };
  tooLong("name");
  tooLong("taxId");
  tooLong("address");
  const e = f.email.trim();
  if (e && !EMAIL.test(e)) out.email = "Enter an email address like name@company.com";
  else tooLong("email");
  return out;
}

/** "Billed to" on an invoice: the billing name (else the profile's), then the address lines, the tax ID, the email. */
export function billedTo(d: BillingFields, fallbackName: string): { name: string; lines: string[] } {
  return {
    name: d.name || fallbackName,
    lines: [...(d.address ? d.address.split("\n") : []), ...(d.taxId ? [`Tax ID: ${d.taxId}`] : []), ...(d.email ? [d.email] : [])],
  };
}

// ──────────────────────────────── browser ─────────────────────────────────

let cache: { raw: string | null; value: BillingDetails } | null = null;

export function readBilling(): BillingDetails {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(BILLING_KEY);
  } catch {
    return EMPTY_BILLING;
  }
  if (cache && cache.raw === raw) return cache.value;
  let parsed: unknown = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }
  const value = normalizeBilling(parsed);
  cache = { raw, value };
  return value;
}

/** Saves the details, normalized; false when the browser refused the write. */
export function saveBilling(f: BillingFields): boolean {
  try {
    window.localStorage.setItem(BILLING_KEY, JSON.stringify(normalizeBilling({ ...f, v: 1 })));
  } catch {
    return false;
  }
  window.dispatchEvent(new Event(EVENT));
  return true;
}

function subscribe(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === BILLING_KEY) onChange();
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useBillingDetails(): BillingDetails {
  return React.useSyncExternalStore(subscribe, readBilling, () => EMPTY_BILLING);
}
