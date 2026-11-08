// Exports this month (upgrade plan C6, decision 2): every plan names how many
// exports a month it gives (Free 2 · Tinkerer 5 · Builder 50 · Disruptor
// 300). They are counted, and the editor says what is left after each one,
// but nothing is ever stopped — exports are soft.
//
// One export is one action: the files a single export writes together (Design
// files: schematic, PCB and 3D) land within seconds, so downloads closer than
// EXPORT_GAP count once. The month is the plan's own credit period, so
// exports come back on the same day as the credits.
//
// `ideeza:exports` — an account's work key (lib/account/work-vault.ts parks it
// with the rest of the account's work). Relative imports only.

import * as React from "react";
import { parseStored, readStoredKey, useStoredKey, writeStoredKey } from "../key-store";

export const EXPORTS_KEY = "ideeza:exports";
/** Downloads closer than this are one export. */
export const EXPORT_GAP = 3000;
const KEEP = 500;

export function normalizeExports(raw: unknown): number[] {
  const at = (raw as { at?: unknown } | null)?.at;
  if (!Array.isArray(at)) return [];
  return at.filter((t): t is number => typeof t === "number" && Number.isFinite(t) && t > 0).sort((a, b) => a - b);
}

/** The log after a download at `now`: a new export, or part of the one still being written. */
export function withExport(at: readonly number[], now: number): number[] {
  const last = at[at.length - 1];
  if (last !== undefined && now - last >= 0 && now - last < EXPORT_GAP) return [...at.slice(0, -1), now];
  return [...at, now].slice(-KEEP);
}

/** Exports in [start, end). */
export function exportsIn(at: readonly number[], start: number, end: number): number {
  return at.filter((t) => t >= start && t < end).length;
}

/** What the editor says after an export: what is left, or that they're used and when they come back. */
export function exportLine(used: number, allowed: number, refill: string, pitch: { name: string; exports: number } | null): string {
  const left = Math.max(0, allowed - used);
  if (left > 0) return `Exported. ${left} of ${allowed} exports left this month.`;
  return `Exported. You've used this month's ${allowed} exports; they come back on ${refill}.${
    pitch ? ` ${pitch.name} gives ${pitch.exports.toLocaleString("en-US")} a month.` : ""
  }`;
}

/** Called by every export download. */
export function recordExport(now: number = Date.now()): void {
  if (typeof window === "undefined") return;
  const at = normalizeExports(parseStored(readStoredKey(EXPORTS_KEY)).value);
  writeStoredKey(EXPORTS_KEY, { v: 1, at: withExport(at, now) });
}

/** The export log, live. */
export function useExports(): { hydrated: boolean; at: number[] } {
  const { hydrated, raw } = useStoredKey(EXPORTS_KEY);
  return React.useMemo(() => ({ hydrated, at: normalizeExports(parseStored(raw).value) }), [hydrated, raw]);
}
