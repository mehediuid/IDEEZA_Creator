// The demo identity check (Build and Earn P1-4), Level 1 of Settings › Get
// paid › Verify your identity (Settings v2, V7). It collects nothing real:
// the form asks a legal name and a country and checks only that they are
// filled in. The name is saved as your private legal name (account/identity.ts,
// its one store); the country is not kept. There are no seller terms to agree
// to (V10: nobody is asked to agree to terms that don't exist). What the check
// itself stores, under `ideeza:commerce:kyc`, is the outcome alone:
// `{ status: "verified", at, demo: true }`.
// It gates only physical editions (L4) and withdrawing in Get paid (asked
// inside the first withdrawal), and it can be reset, which removes the key.
//
// The two higher checks, from $1,000 and from $5,000 of total sales, need
// documents and a reviewer, which the app doesn't have: Get paid names them
// in one line, and only once your sales come near the threshold.
//
// No vendor, no document, no network. Pure apart from the guarded
// localStorage read and writes, with relative imports only (node:test).

export const KYC_KEY = "ideeza:commerce:kyc";

export type KycRecord = { status: "verified"; at: number; demo: true };
export type KycStatus = "none" | "verified";

/** The higher checks' thresholds, in US dollars of total sales (at the demo rates). */
export const KYC_INTERMEDIATE_AT = 1000;
export const KYC_ADVANCED_AT = 5000;
/** How near a threshold the one line starts to show: 75 % of it. */
const NEAR = 0.75;

/** The higher check to mention now: the next threshold once sales reach 75 % of it, or the one
 *  passed until the next comes near; null well below $1,000. */
export function higherCheckOf(salesUsd: number): { at: number; passed: boolean } | null {
  if (salesUsd >= KYC_ADVANCED_AT * NEAR) return { at: KYC_ADVANCED_AT, passed: salesUsd >= KYC_ADVANCED_AT };
  if (salesUsd >= KYC_INTERMEDIATE_AT * NEAR) return { at: KYC_INTERMEDIATE_AT, passed: salesUsd >= KYC_INTERMEDIATE_AT };
  return null;
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

/** The form's fields: each must hold something, within its length. Nothing else is checked. */
export function kycFormProblems(form: { name: string; country: string }): { name?: string; country?: string } {
  const out: { name?: string; country?: string } = {};
  const name = form.name.trim();
  const country = form.country.trim();
  if (!name) out.name = "Enter your full legal name.";
  else if (name.length > KYC_NAME_MAX) out.name = `Keep the name under ${KYC_NAME_MAX} characters.`;
  if (!country) out.country = "Choose your country of residence.";
  else if (country.length > KYC_COUNTRY_MAX) out.country = `Keep the country under ${KYC_COUNTRY_MAX} characters.`;
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
