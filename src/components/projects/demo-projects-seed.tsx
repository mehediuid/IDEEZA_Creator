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
// returning one keeps whatever it did with them. Nothing is written over a
// store that doesn't read (an unreadable list stays as it is), and a project
// already there is never replaced.

import * as React from "react";
import { commerceKey } from "@/lib/commerce/record";
import { BUILDS_KEY } from "@/lib/create/history";
import { notifyStores } from "@/lib/key-store";
import { DEMO_PROJECT_IDS, DEMO_SEED_KEY, demoSeedOf } from "@/lib/demo/demo-projects";
import { PROJECTS_KEY } from "@/lib/manual/projects";
import { EDITIONS_KEY, LISTINGS_KEY, SALES_KEY } from "@/lib/market/types";

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

/** True when it planted them now. */
export function plantDemoProjects(storage: Storage, now: number): boolean {
  if (storage.getItem(DEMO_SEED_KEY) !== null) return false;
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
    storage.setItem(DEMO_SEED_KEY, JSON.stringify({ at: now, ids: DEMO_PROJECT_IDS }));
  } catch {
    // Storage full or blocked: the account simply has no demo projects this time.
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
    if (plantDemoProjects(storage, Date.now())) notifyStores();
  }, []);
  return null;
}
