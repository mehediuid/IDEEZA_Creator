// The phone's KYC levels 2 and 3 (mobile Figma "Level 2" / "Level 3":
// Intermediate KYC from $1,000 of total sales, Advanced KYC from $5,000).
// Level 1 is the web's demo identity check (kyc.ts). The higher checks need
// documents and a reviewer the app doesn't have, so the phone runs them as a
// demo: a Demo ID check stands in for the provider's app and records only the
// outcome — submitted (under review), approved or rejected, and when. No
// document, number or photo is read or kept. Nothing is limited by them
// (web, kyc.ts: "nothing is limited"), so they gate nothing but each other:
// Level 2 needs Level 1, Level 3 needs Level 2 approved.
//
// Pure apart from the guarded localStorage read and write; relative imports only.

import { KYC_ADVANCED_AT, KYC_INTERMEDIATE_AT } from "./kyc";

export const KYC_LEVELS_KEY = "ideeza:commerce:kyc-levels";

export type HigherLevel = "intermediate" | "advanced";
export type LevelStatus = "none" | "review" | "rejected" | "approved";
export type LevelRecord = { status: Exclude<LevelStatus, "none">; at: number };
export type KycLevels = { v: 1; intermediate: LevelRecord | null; advanced: LevelRecord | null };

export const EMPTY_LEVELS: KycLevels = { v: 1, intermediate: null, advanced: null };

/** Each higher level's threshold in US dollars of total sales (at the demo rates). */
export const LEVEL_AT: Record<HigherLevel, number> = { intermediate: KYC_INTERMEDIATE_AT, advanced: KYC_ADVANCED_AT };

const STATUSES: readonly LevelRecord["status"][] = ["review", "rejected", "approved"];

function isDict(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function normalizeRecord(raw: unknown): LevelRecord | null {
  if (!isDict(raw)) return null;
  const status = STATUSES.find((s) => s === raw.status);
  const at = raw.at;
  if (!status || typeof at !== "number" || !Number.isFinite(at) || at <= 0) return null;
  return { status, at };
}

/** The stored record; anything broken reads as not submitted, a level at a time. */
export function normalizeLevels(raw: unknown): KycLevels {
  if (!isDict(raw) || raw.v !== 1) return EMPTY_LEVELS;
  const intermediate = normalizeRecord(raw.intermediate);
  // Level 3 can't stand on a Level 2 that isn't approved.
  const advanced = intermediate?.status === "approved" ? normalizeRecord(raw.advanced) : null;
  return { v: 1, intermediate, advanced };
}

export function parseLevels(raw: string | null): KycLevels {
  if (!raw) return EMPTY_LEVELS;
  try {
    return normalizeLevels(JSON.parse(raw));
  } catch {
    return EMPTY_LEVELS;
  }
}

export function levelStatusOf(levels: KycLevels, level: HigherLevel): LevelStatus {
  return levels[level]?.status ?? "none";
}

/** Why a level can't be started now; null when it can. */
export function startBlockOf(levels: KycLevels, level: HigherLevel, level1Verified: boolean): string | null {
  if (!level1Verified) return "Verify your identity (Level 1) first.";
  if (level === "advanced" && levelStatusOf(levels, "intermediate") !== "approved") return "Intermediate KYC (Level 2) has to be approved first.";
  const s = levelStatusOf(levels, level);
  if (s === "review") return "It's under review.";
  if (s === "approved") return "It's approved.";
  return null;
}

/** Sent to the (demo) reviewer: under review from `at`. The same record when it can't start. */
export function submitLevel(levels: KycLevels, level: HigherLevel, level1Verified: boolean, at: number): KycLevels {
  if (startBlockOf(levels, level, level1Verified)) return levels;
  return { ...levels, [level]: { status: "review", at } };
}

/** The reviewer's answer to a level under review. Rejecting Level 2 also drops Level 3. */
export function reviewLevel(levels: KycLevels, level: HigherLevel, outcome: "approved" | "rejected", at: number): KycLevels {
  if (levelStatusOf(levels, level) !== "review") return levels;
  const next: KycLevels = { ...levels, [level]: { status: outcome, at } };
  if (level === "intermediate" && outcome === "rejected") next.advanced = null;
  return next;
}

/** The level the account's sales have reached and isn't approved yet: what to ask for now; null when none. */
export function levelDueOf(levels: KycLevels, salesUsd: number): HigherLevel | null {
  if (salesUsd >= LEVEL_AT.advanced && levelStatusOf(levels, "advanced") !== "approved") {
    return levelStatusOf(levels, "intermediate") === "approved" ? "advanced" : "intermediate";
  }
  if (salesUsd >= LEVEL_AT.intermediate && levelStatusOf(levels, "intermediate") !== "approved") return "intermediate";
  return null;
}

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readLevelsRaw(): string | null {
  try {
    return storage()?.getItem(KYC_LEVELS_KEY) ?? null;
  } catch {
    return null;
  }
}

/** `false`: the browser refused the write, and the prior record stands. */
export function writeLevels(levels: KycLevels): boolean {
  const s = storage();
  if (!s) return false;
  try {
    if (!levels.intermediate && !levels.advanced) s.removeItem(KYC_LEVELS_KEY);
    else s.setItem(KYC_LEVELS_KEY, JSON.stringify(levels));
    return true;
  } catch {
    return false;
  }
}
