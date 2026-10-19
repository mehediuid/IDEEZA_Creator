// The demo identity check (Build and Earn P1-4), shown as Level 1 of Settings
// › KYC Verification (Settings spec §5.5, D6). It collects nothing real: the
// form asks a name, a country and the seller terms, checks only that they are
// filled in, and stores none of them. What it stores, under
// `ideeza:commerce:kyc`, is the outcome alone: `{ status: "verified", at, demo: true }`.
// It gates only physical editions (L4) and withdrawing in Get Paid, and it
// can be reset, which removes the key.
//
// Figma's two higher levels, Intermediate from $1,000 of total transactions
// and Advanced from $5,000, need documents and a reviewer, which the app
// doesn't have: they are shown with the live total and stay Not Submitted.
//
// No vendor, no document, no network. Pure apart from the guarded
// localStorage read and writes, with relative imports only (node:test).

export const KYC_KEY = "ideeza:commerce:kyc";

export type KycRecord = { status: "verified"; at: number; demo: true };
export type KycStatus = "none" | "verified";

/** Figma's thresholds, in US dollars of total transactions. */
export const KYC_INTERMEDIATE_AT = 1000;
export const KYC_ADVANCED_AT = 5000;

export type KycLevelId = "level-1" | "intermediate" | "advanced";
export type KycLevelStatus = "not-submitted" | "under-review" | "rejected" | "approved";
export type KycLevel = {
  id: KycLevelId;
  status: KycLevelStatus;
  /** Asked of you now: Level 1 to sell and withdraw, the others once sales pass their threshold. */
  needed: boolean;
  /** Dollars of total transactions it starts at; null for Level 1. */
  threshold: number | null;
  /** When it was approved. */
  at: number | null;
};

/** The three levels and where you stand on each, from the demo check and your total sales in dollars. */
export function kycLevelsOf(rec: KycRecord | null, salesUsd: number): KycLevel[] {
  return [
    { id: "level-1", status: rec ? "approved" : "not-submitted", needed: true, threshold: null, at: rec?.at ?? null },
    { id: "intermediate", status: "not-submitted", needed: salesUsd >= KYC_INTERMEDIATE_AT, threshold: KYC_INTERMEDIATE_AT, at: null },
    { id: "advanced", status: "not-submitted", needed: salesUsd >= KYC_ADVANCED_AT, threshold: KYC_ADVANCED_AT, at: null },
  ];
}

export const KYC_NAME_MAX = 80;
export const KYC_COUNTRY_MAX = 56;

function isDict(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/** A stored record, or null for anything that isn't exactly a demo verification. */
export function normalizeKyc(raw: unknown): KycRecord | null {
  if (!isDict(raw) || raw.status !== "verified" || raw.demo !== true) return null;
  const at = raw.at;
  if (typeof at !== "number" || !Number.isFinite(at) || at <= 0) return null;
  return { status: "verified", at, demo: true };
}

/** The stored string, parsed: missing, corrupt or foreign JSON reads as not verified. */
export function parseKyc(raw: string | null): KycRecord | null {
  if (!raw) return null;
  try {
    return normalizeKyc(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function kycStatusOf(rec: KycRecord | null): KycStatus {
  return rec ? "verified" : "none";
}

export function verifiedKyc(at: number): KycRecord {
  return { status: "verified", at, demo: true };
}

/** The form's fields: each must hold something, within its length, and the terms (when
 *  asked) ticked. Nothing else is checked. */
export function kycFormProblems(form: { name: string; country: string; terms?: boolean }): {
  name?: string;
  country?: string;
  terms?: string;
} {
  const out: { name?: string; country?: string; terms?: string } = {};
  const name = form.name.trim();
  const country = form.country.trim();
  if (!name) out.name = "Enter your full legal name.";
  else if (name.length > KYC_NAME_MAX) out.name = `Keep the name under ${KYC_NAME_MAX} characters.`;
  if (!country) out.country = "Choose your country of residence.";
  else if (country.length > KYC_COUNTRY_MAX) out.country = `Keep the country under ${KYC_COUNTRY_MAX} characters.`;
  if (form.terms === false) out.terms = "Tick the box to agree to the Marketplace Seller Terms.";
  return out;
}

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readKycRaw(): string | null {
  try {
    return storage()?.getItem(KYC_KEY) ?? null;
  } catch {
    return null;
  }
}

export function readKyc(): KycRecord | null {
  return parseKyc(readKycRaw());
}

/** `false`: the browser refused the write, and the prior state stands. */
export function writeKyc(rec: KycRecord): boolean {
  const s = storage();
  if (!s) return false;
  try {
    s.setItem(KYC_KEY, JSON.stringify(rec));
    return true;
  } catch {
    return false;
  }
}

/** Reset: the key is removed, so the next read is "not verified". */
export function resetKyc(): boolean {
  const s = storage();
  if (!s) return false;
  try {
    s.removeItem(KYC_KEY);
    return true;
  } catch {
    return false;
  }
}
