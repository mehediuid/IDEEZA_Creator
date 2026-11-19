"use client";

// Plants the account's demo projects (lib/demo/demo-projects.ts; owner,
// 2026-11-16: My projects always has data) before any store reads them.
// Mounted in the root layout ahead of the providers: a layout effect runs
// before every store's hydrating effect, so the projects and builds stores
// read the four projects on their first read, and the market and editions
// readers are told to re-read (notifyStores).
//
// Once per account: DEMO_SEED_KEY is part of the account's work, parked and
// restored with it (work-vault.ts), so a new account gets its own four and a
// returning one keeps whatever it did with them. With them come the demo
// creators' purchases of sample listings (demo-purchases.ts; owner, 2026-11-19:
// My projects › Purchased always has every kind). A later seed version only
// tops up what it added (copy tracks a planted project lacks, the sales and
// purchases it lacks while their listings can still take them). Nothing is
// written over a store that doesn't read (an unreadable list stays as it is),
// and a project already there is never replaced.

import * as React from "react";
import { commerceKey } from "@/lib/commerce/record";
import { BUILDS_KEY } from "@/lib/create/history";
import { notifyStores } from "@/lib/key-store";
import { DEMO_PROJECT_IDS, DEMO_SEED_KEY, DEMO_SEED_VERSION, demoSeedOf, withDemoSales } from "@/lib/demo/demo-projects";
import { withDemoResales, withDemoSampleSales, withDemoUnits } from "@/lib/demo/demo-purchases";
import { normalizeResales, RESALES_KEY } from "@/lib/market/resales";
import { normalizeUnits, UNITS_KEY } from "@/lib/market/units";
import { ACQUIRED_KEY, acquiredToPlant } from "@/lib/demo/acquired-projects";
import { PROJECTS_KEY } from "@/lib/manual/projects";
import { normalizeSampleSales, PHONE_SAMPLE_SALES_KEY } from "@/lib/market/phone-sample-sales";
import { EDITIONS_KEY, LISTINGS_KEY, SALES_KEY, type EditionTrack, type Sale } from "@/lib/market/types";

type WithId = { id: string };

function readList(storage: Storage, key: string): unknown[] | null {
  const raw = storage.getItem(key);
  if (raw === null) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

const hasId = (list: unknown[], id: string) => list.some((x) => typeof x === "object" && x !== null && (x as WithId).id === id);

function withMissing<T extends WithId>(list: unknown[], add: readonly T[]): unknown[] {
  return [...list, ...add.filter((x) => !hasId(list, x.id))];
}

/** The planted seed's version: 1 for a planting from before versions, 0 for none. */
function plantedVersion(storage: Storage): number {
  const raw = storage.getItem(DEMO_SEED_KEY);
  if (raw === null) return 0;
  try {
    const v = (JSON.parse(raw) as { v?: unknown }).v;
    return typeof v === "number" ? v : 1;
  } catch {
    return 1;
  }
}

/** The demo creators' purchases of sample listings the account lacks; false when the list doesn't read. */
function plantSamplePurchases(storage: Storage, now: number): boolean {
  const held = readList(storage, PHONE_SAMPLE_SALES_KEY);
  if (!held) return false;
  const sales = normalizeSampleSales(held);
  const next = withDemoSampleSales(sales, now);
  if (next.length === sales.length) return false;
  storage.setItem(PHONE_SAMPLE_SALES_KEY, JSON.stringify(next));
  return true;
}

/** The demo units already made (units.ts) the log lacks, on the copies their sales hold. */
function plantUnits(storage: Storage, now: number): boolean {
  const log = readList(storage, UNITS_KEY);
  const sample = readList(storage, PHONE_SAMPLE_SALES_KEY);
  const own = readList(storage, SALES_KEY);
  if (!log || !sample || !own) return false;
  const held = normalizeUnits(log);
  const next = withDemoUnits(held, normalizeSampleSales(sample), own as Sale[], now);
  if (next.length === held.length) return false;
  storage.setItem(UNITS_KEY, JSON.stringify(next));
  return true;
}

/** The demo creators' copies for sale and sold on (resales.ts) the list lacks, while their sellers hold them. */
function plantResales(storage: Storage, now: number): boolean {
  const list = readList(storage, RESALES_KEY);
  const sample = readList(storage, PHONE_SAMPLE_SALES_KEY);
  const own = readList(storage, SALES_KEY);
  const log = readList(storage, UNITS_KEY);
  const projects = readList(storage, PROJECTS_KEY);
  if (!list || !sample || !own || !log || !projects) return false;
  const held = normalizeResales(list);
  const ownOf = (projectId: string) => {
    const p = projects.find((x) => typeof x === "object" && x !== null && (x as WithId).id === projectId) as { name?: unknown } | undefined;
    const tracks = readList(storage, EDITIONS_KEY(projectId)) as EditionTrack[] | null;
    return p && tracks ? { name: typeof p.name === "string" ? p.name : projectId, tracks } : null;
  };
  const next = withDemoResales(held, normalizeSampleSales(sample), own as Sale[], normalizeUnits(log), now, ownOf);
  if (next.length === held.length && next.every((r, i) => r === held[i])) return false;
  storage.setItem(RESALES_KEY, JSON.stringify(next));
  return true;
}

/** An older planting gets what a later seed added: copy tracks it lacks, on projects still there whose copies
 *  read; the sales it lacks, while what they sold is still there; the sample purchases. Nothing the maker changed
 *  is replaced. True when it wrote. */
function topUp(storage: Storage, now: number): boolean {
  const projects = readList(storage, PROJECTS_KEY);
  if (!projects) return false;
  const seed = demoSeedOf(now);
  let wrote = false;
  try {
    for (const [projectId, tracks] of Object.entries(seed.editions)) {
      if (!hasId(projects, projectId)) continue;
      const held = readList(storage, EDITIONS_KEY(projectId));
      if (!held) continue;
      const next = withMissing(held, tracks);
      if (next.length !== held.length) {
        storage.setItem(EDITIONS_KEY(projectId), JSON.stringify(next));
        wrote = true;
      }
    }
    const sales = readList(storage, SALES_KEY);
    if (sales) {
      const ours = seed.sales.filter((x) => hasId(projects, x.projectId));
      const tracksOf = (projectId: string) => readList(storage, EDITIONS_KEY(projectId)) as EditionTrack[] | null;
      const next = withDemoSales(sales as Sale[], ours, tracksOf);
      if (next.length !== sales.length) {
        storage.setItem(SALES_KEY, JSON.stringify(next));
        wrote = true;
      }
    }
    if (plantSamplePurchases(storage, now)) wrote = true;
    if (plantUnits(storage, now)) wrote = true;
    if (plantResales(storage, now)) wrote = true;
    storage.setItem(DEMO_SEED_KEY, JSON.stringify({ v: DEMO_SEED_VERSION, at: now, ids: DEMO_PROJECT_IDS }));
  } catch {
    return false;
  }
  return wrote;
}

/** True when it planted or topped them up now. */
export function plantDemoProjects(storage: Storage, now: number): boolean {
  const planted = plantedVersion(storage);
  if (planted >= DEMO_SEED_VERSION) return false;
  if (planted > 0) return topUp(storage, now);
  const lists = [PROJECTS_KEY, BUILDS_KEY, LISTINGS_KEY, SALES_KEY].map((k) => readList(storage, k));
  const [projects, builds, listings, sales] = lists;
  if (!projects || !builds || !listings || !sales) return false;
  const seed = demoSeedOf(now);
  try {
    storage.setItem(PROJECTS_KEY, JSON.stringify(withMissing(projects, seed.projects)));
    storage.setItem(BUILDS_KEY, JSON.stringify(withMissing(builds, seed.builds)));
    storage.setItem(LISTINGS_KEY, JSON.stringify(withMissing(listings, seed.listings)));
    storage.setItem(SALES_KEY, JSON.stringify(withMissing(sales, seed.sales)));
    for (const [projectId, tracks] of Object.entries(seed.editions)) {
      if (storage.getItem(EDITIONS_KEY(projectId)) === null) storage.setItem(EDITIONS_KEY(projectId), JSON.stringify(tracks));
    }
    for (const p of seed.projects) {
      if (p.mint && storage.getItem(commerceKey(p.id)) === null) {
        storage.setItem(commerceKey(p.id), JSON.stringify({ v: 1, mint: p.mint, ownerConfirmedAt: p.ownerConfirmedAt }));
      }
    }
    plantSamplePurchases(storage, now);
    plantUnits(storage, now);
    plantResales(storage, now);
    storage.setItem(DEMO_SEED_KEY, JSON.stringify({ v: DEMO_SEED_VERSION, at: now, ids: DEMO_PROJECT_IDS }));
  } catch {
    // Storage full or blocked: the account simply has no demo projects this time.
    return false;
  }
  return true;
}

/** A project for every sample Main NFT bought and not made before (acquired-projects.ts): the buyer's own,
 *  browsed like any project. Runs on every start, after the demo planting, ahead of the stores. */
export function plantAcquired(storage: Storage): boolean {
  const projects = readList(storage, PROJECTS_KEY);
  const builds = readList(storage, BUILDS_KEY);
  const sales = readList(storage, PHONE_SAMPLE_SALES_KEY);
  if (!projects || !builds || !sales) return false;
  let made: string[] = [];
  try {
    const raw: unknown = JSON.parse(storage.getItem(ACQUIRED_KEY) ?? "[]");
    made = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
  } catch {
    made = [];
  }
  const add = acquiredToPlant(normalizeSampleSales(sales), new Set(made));
  if (!add.length) return false;
  try {
    storage.setItem(PROJECTS_KEY, JSON.stringify(withMissing(projects, add.map((a) => a.project))));
    storage.setItem(BUILDS_KEY, JSON.stringify(withMissing(builds, add.flatMap((a) => a.builds))));
    for (const { project } of add) {
      if (project.mint && storage.getItem(commerceKey(project.id)) === null) {
        storage.setItem(commerceKey(project.id), JSON.stringify({ v: 1, mint: project.mint, ownerConfirmedAt: project.ownerConfirmedAt }));
      }
    }
    storage.setItem(ACQUIRED_KEY, JSON.stringify([...made, ...add.map((a) => a.project.id)]));
  } catch {
    return false;
  }
  return true;
}

export function DemoProjectsSeed() {
  React.useLayoutEffect(() => {
    let storage: Storage;
    try {
      storage = window.localStorage;
    } catch {
      return;
    }
    const planted = plantDemoProjects(storage, Date.now());
    const acquired = plantAcquired(storage);
    if (planted || acquired) notifyStores();
  }, []);
  return null;
}
