// A project's business plan, live (Phase 2 spec §3.4, §3.6.2; P2-TABS-13…20):
// `ideeza:project:bizplan:<projectId>`. The runner (T21) writes section by
// section from outside any one page, so the plain read/write pair is
// exported beside the hook.
//
// `normalizePlan` is here because business-plan.ts (T08) shipped without the
// normalizer §3.4 names. Like `normalizeJourney`, it drops a malformed entry
// (a version, a section, a pricing tier) and keeps the rest.

import * as React from "react";
import { parseStored, readStoredKey, storedUnreadable, useStoredKey, writeStoredKey, type WriteResult } from "../key-store";
import {
  BIZPLAN_KEY,
  PLAN_SECTIONS,
  type BusinessPlan,
  type PlanSection,
  type PlanVersion,
  type PricingTier,
} from "./business-plan";

const MAX_VERSIONS = 5;
const KINDS: ReadonlySet<string> = new Set([...PLAN_SECTIONS, "custom"]);
const ORIGINS: ReadonlySet<string> = new Set(["ai", "edited", "added"]);
const STATES: ReadonlySet<string> = new Set(["done", "failed", "pending"]);

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

function tierIn(v: unknown): PricingTier | null {
  if (!isObj(v) || !isStr(v.name) || !isStr(v.price) || !isStr(v.cadence) || !Array.isArray(v.features)) return null;
  const tier: PricingTier = { name: v.name, price: v.price, cadence: v.cadence, features: v.features.filter(isStr) };
  if (v.recommended === true) tier.recommended = true;
  return tier;
}

function fieldIn(v: unknown): string | string[] | PricingTier[] | null {
  if (isStr(v)) return v;
  if (!Array.isArray(v)) return null;
  if (v.every(isStr)) return v;
  const tiers = v.map(tierIn).filter((t): t is PricingTier => t !== null);
  return tiers.length ? tiers : null;
}

function sectionIn(v: unknown): PlanSection | null {
  if (!isObj(v) || !isStr(v.id) || !v.id || !isStr(v.title)) return null;
  if (!isStr(v.kind) || !KINDS.has(v.kind) || !isStr(v.origin) || !ORIGINS.has(v.origin)) return null;
  if (!isStr(v.state) || !STATES.has(v.state) || !isObj(v.fields)) return null;
  const fields: PlanSection["fields"] = {};
  for (const [k, f] of Object.entries(v.fields)) {
    const kept = fieldIn(f);
    if (kept !== null) fields[k] = kept;
  }
  return {
    id: v.id,
    kind: v.kind as PlanSection["kind"],
    title: v.title,
    fields,
    origin: v.origin as PlanSection["origin"],
    state: v.state as PlanSection["state"],
  };
}

function versionIn(v: unknown): PlanVersion | null {
  if (!isObj(v) || !isNum(v.n) || v.n < 1 || !isStr(v.prompt) || !isNum(v.createdAt) || !Array.isArray(v.sections)) {
    return null;
  }
  const sections = v.sections.map(sectionIn).filter((s): s is PlanSection => s !== null);
  return { n: v.n, prompt: v.prompt, createdAt: v.createdAt, sections };
}

function runIn(v: unknown): BusinessPlan["run"] | undefined {
  if (!isObj(v) || !isNum(v.version) || !isNum(v.next) || !isNum(v.startedAt)) return undefined;
  const run: NonNullable<BusinessPlan["run"]> = { version: v.version, next: v.next, startedAt: v.startedAt };
  if (isNum(v.stoppedAt)) run.stoppedAt = v.stoppedAt;
  return run;
}

/** The stored plan, or null when there's none to read. Versions are kept in
 *  order, one per `n`, at most 5 (the newest); `current` falls back to the
 *  newest version when it names none of them. */
export function normalizePlan(raw: unknown, projectId: string): BusinessPlan | null {
  if (!isObj(raw) || raw.v !== 1 || !Array.isArray(raw.versions)) return null;
  const byN = new Map<number, PlanVersion>();
  for (const v of raw.versions) {
    const kept = versionIn(v);
    if (kept && !byN.has(kept.n)) byN.set(kept.n, kept);
  }
  const versions = [...byN.values()].sort((a, b) => a.n - b.n).slice(-MAX_VERSIONS);
  const newest = versions.length ? versions[versions.length - 1].n : 0;
  const current = isNum(raw.current) && versions.some((v) => v.n === raw.current) ? raw.current : newest;
  const plan: BusinessPlan = { v: 1, projectId, current, versions };
  const run = runIn(raw.run);
  if (run) plan.run = run;
  return plan;
}

export function decodeBusinessPlan(raw: string | null, projectId: string): BusinessPlan | null {
  const { value } = parseStored(raw);
  return value === undefined ? null : normalizePlan(value, projectId);
}

export function readBusinessPlan(projectId: string): BusinessPlan | null {
  return decodeBusinessPlan(readStoredKey(BIZPLAN_KEY(projectId)), projectId);
}

/** Writes under `projectId`'s key, whatever `next.projectId` says. Refused (and the key left as it
 *  is) when the stored plan can't be read, so its versions are never overwritten blind. */
export function writeBusinessPlan(projectId: string, next: BusinessPlan): WriteResult {
  if (!projectId) return { ok: false };
  if (storedUnreadable(BIZPLAN_KEY(projectId), (v) => normalizePlan(v, projectId) !== null)) return { ok: false };
  return writeStoredKey(BIZPLAN_KEY(projectId), { ...next, projectId });
}

export function useBusinessPlan(projectId: string | null | undefined): {
  hydrated: boolean;
  record: BusinessPlan | null;
  write: (next: BusinessPlan) => WriteResult;
} {
  const id = projectId || null;
  const { hydrated, raw } = useStoredKey(id ? BIZPLAN_KEY(id) : null);
  const record = React.useMemo(() => (id ? decodeBusinessPlan(raw, id) : null), [raw, id]);
  const write = React.useCallback((next: BusinessPlan) => writeBusinessPlan(id ?? "", next), [id]);
  return { hydrated, record, write };
}
