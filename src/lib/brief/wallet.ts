// Brief module — the collections a mint can land in, per chain.
//
// There is no backend, so a collection is a local record: what the user (or the
// seed) created in this browser. Collections are per chain because a collection
// on Base Sepolia is not a collection on Mumbai.

import type { Network } from "./types";

const WALLET_KEY = "ideeza:brief:wallet";

export type WalletCollection = { id: string; name: string; network: Network };

type WalletStore = Partial<Record<Network, WalletCollection[]>>;

// Seeded so the picker isn't empty on a first visit — these are the collections
// the design shows.
const SEEDS: Record<Network, string[]> = {
  baseSepolia: [
    "Test Collection for V2",
    "Test Base Sepolia Collection 18-01 001",
    "Test Collection",
    "New Version Collection",
  ],
  mumbai: ["Test Collection", "New Version Collection"],
};

function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "collection"
  );
}

function makeId(network: Network, name: string, taken: Set<string>): string {
  const base = `${network}-${slug(name)}`;
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

function seedFor(network: Network): WalletCollection[] {
  const taken = new Set<string>();
  return SEEDS[network].map((name) => {
    const id = makeId(network, name, taken);
    taken.add(id);
    return { id, name, network };
  });
}

function readStore(): WalletStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(WALLET_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as WalletStore;
  } catch {
    return {};
  }
}

function writeStore(store: WalletStore) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WALLET_KEY, JSON.stringify(store));
  } catch {}
}

function sanitize(rows: unknown, network: Network): WalletCollection[] | null {
  if (!Array.isArray(rows)) return null;
  const out: WalletCollection[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (typeof r.id !== "string" || typeof r.name !== "string") continue;
    out.push({ id: r.id, name: r.name, network });
  }
  return out;
}

/** Every collection on `network`, seeding (and persisting) on first read. */
export function readCollections(network: Network): WalletCollection[] {
  const store = readStore();
  const raw = store[network];
  const stored = sanitize(raw, network);
  // A stored array whose rows were all invalid sanitizes to `[]`, which is
  // truthy — without this check the picker would silently stay empty forever
  // instead of re-seeding like a missing/corrupt store does.
  const allRowsInvalid = stored !== null && stored.length === 0 && Array.isArray(raw) && raw.length > 0;
  if (stored && !allRowsInvalid) return stored;
  const seeded = seedFor(network);
  writeStore({ ...store, [network]: seeded });
  return seeded;
}

/**
 * Create a collection on `network`. Idempotent on the name (case-insensitive,
 * trimmed): adding one that already exists returns the existing row rather than
 * a duplicate the user would then have to tell apart.
 */
export function addCollection(network: Network, name: string): WalletCollection {
  const trimmed = name.trim();
  const rows = readCollections(network);
  const existing = rows.find(
    (c) => c.name.trim().toLowerCase() === trimmed.toLowerCase(),
  );
  if (existing) return existing;

  const created: WalletCollection = {
    id: makeId(network, trimmed, new Set(rows.map((c) => c.id))),
    name: trimmed,
    network,
  };
  const store = readStore();
  writeStore({ ...store, [network]: [...rows, created] });
  return created;
}
