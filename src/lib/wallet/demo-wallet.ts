// The demo wallet store (Phase 2 spec §3.3.1, §3.5.3, owner decision 1). Six
// identities — the maker's three demo accounts and Explore's three demo
// buyers — share one deterministic, local wallet, keyed `ideeza:wallet:demo`.
// Nothing here touches a chain: `demoHex` is a pure, non-cryptographic hash
// (D8), and every address it produces is the same in every browser (MINT-1's
// test vectors).
//
// Balances are NOT stored here — they are derived (`../wallet/balances.ts`,
// C4) from this wallet's activity plus the marketplace's sales. This module
// only holds identity/connection state and the activity log those balances
// read.
//
// Pure, relative imports only; storage helpers are guarded by `typeof
// window` so this module loads in node:test and on the server alike.

import type { Network } from "../brief/types";
import type {
  AccountIndex,
  Charge,
  ChargeLine,
  Coin,
  DemoBuyerId,
  DemoWallet,
  IdentityId,
  MakerId,
  WalletActivity,
} from "./types";

export const DEMO_WALLET_KEY = "ideeza:wallet:demo";

const ACCOUNT_INDEXES: readonly AccountIndex[] = [1, 2, 3];
const BUYER_IDS: readonly DemoBuyerId[] = ["buyer-mira", "buyer-leo", "buyer-sam"];
const NETWORK_IDS: readonly Network[] = ["baseSepolia", "mumbai"];
const DEFAULT_NETWORK: Network = "baseSepolia";

/** The seed each buyer's address is derived from (§3.5.3: `"ideeza:testnet-demo:buyer:" + name`). */
export const BUYER_NAME: Record<DemoBuyerId, string> = {
  "buyer-mira": "Mira",
  "buyer-leo": "Leo",
  "buyer-sam": "Sam",
};

// ── the hash (D8: no crypto; patterned on purpose, so it never passes for real) ──

function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * FNV-1a-32 concatenated over `input+"#"+i` for i = 0, 1, 2 …, as 8 hex
 * characters each, cut to `n`. Pure, no crypto, deterministic across every
 * browser and every run.
 */
export function demoHex(input: string, n: number): string {
  let out = "";
  let i = 0;
  while (out.length < n) {
    out += fnv1a32(`${input}#${i}`).toString(16).padStart(8, "0");
    i += 1;
  }
  return out.slice(0, n);
}

function accountIndexOf(id: MakerId): AccountIndex {
  return Number(id.slice("maker-".length)) as AccountIndex;
}

export function makerId(index: AccountIndex): MakerId {
  return `maker-${index}`;
}

function isBuyerId(id: IdentityId): id is DemoBuyerId {
  return id === "buyer-mira" || id === "buyer-leo" || id === "buyer-sam";
}

/** `"0x955de749945de5b6935de423925de290995ded95"` for account 1 — MINT-1's vectors. */
export function demoAddress(id: IdentityId): string {
  const seed = isBuyerId(id)
    ? `ideeza:testnet-demo:buyer:${BUYER_NAME[id]}`
    : `ideeza:testnet-demo:account:${accountIndexOf(id)}`;
  return `0x${demoHex(seed, 40)}`;
}

/** `"0x955d…ed95"`: the first 6 characters, "…", then the last 4. */
export function shortAddress(address: string): string {
  if (typeof address !== "string" || address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

// ── the default wallet, and normalizing a stored one ───────────────────────

function isDict(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

export function defaultWallet(): DemoWallet {
  const identities = {} as DemoWallet["identities"];
  for (const n of ACCOUNT_INDEXES) identities[makerId(n)] = { connected: false, network: DEFAULT_NETWORK };
  for (const id of BUYER_IDS) identities[id] = { connected: false, network: DEFAULT_NETWORK };
  return { v: 2, account: 1, identities, activity: [] };
}

function sanitizeIdentityState(raw: unknown): { connected: boolean; network: Network } {
  const r = isDict(raw) ? raw : {};
  return {
    connected: r.connected === true,
    network: NETWORK_IDS.includes(r.network as Network) ? (r.network as Network) : DEFAULT_NETWORK,
  };
}

function sanitizeChargeLine(raw: unknown): ChargeLine | null {
  if (!isDict(raw)) return null;
  if (typeof raw.coin !== "string" || typeof raw.amount !== "string") return null;
  return { coin: raw.coin as Coin, amount: raw.amount };
}

/** A stored charge, or undefined when it doesn't parse — also how a mint record keeps its own (MINT-8). */
export function sanitizeCharge(raw: unknown): Charge | undefined {
  if (!isDict(raw) || !Array.isArray(raw.lines)) return undefined;
  if (!NETWORK_IDS.includes(raw.network as Network)) return undefined;
  const lines = raw.lines.map(sanitizeChargeLine).filter((l): l is ChargeLine => l !== null);
  if (!lines.length) return undefined;
  return { network: raw.network as Network, lines };
}

function sanitizeActivityEntry(raw: unknown): WalletActivity | null {
  if (!isDict(raw)) return null;
  if (typeof raw.id !== "string" || typeof raw.at !== "number" || !Number.isFinite(raw.at)) return null;
  if (typeof raw.identity !== "string") return null;
  const identity = raw.identity as IdentityId;
  if (!isBuyerId(identity) && !/^maker-[123]$/.test(identity)) return null;
  if (!NETWORK_IDS.includes(raw.network as Network)) return null;
  if (raw.kind !== "signature" && raw.kind !== "transaction") return null;
  if (typeof raw.title !== "string") return null;
  const entry: WalletActivity = {
    id: raw.id,
    at: raw.at,
    identity,
    network: raw.network as Network,
    kind: raw.kind,
    title: raw.title,
  };
  if (typeof raw.projectId === "string") entry.projectId = raw.projectId;
  if (typeof raw.txHash === "string") entry.txHash = raw.txHash;
  if (typeof raw.signature === "string") entry.signature = raw.signature;
  const charge = sanitizeCharge(raw.charge);
  if (charge) entry.charge = charge;
  return entry;
}

function sanitizeActivity(raw: unknown): WalletActivity[] {
  if (!Array.isArray(raw)) return [];
  const out: WalletActivity[] = [];
  for (const row of raw) {
    const entry = sanitizeActivityEntry(row);
    if (entry) out.push(entry);
  }
  return out;
}

/**
 * A missing, corrupt or v1 record normalizes to the default wallet: not
 * connected, account 1, every identity on Base Sepolia, no activity. Never
 * throws.
 */
export function normalizeWallet(raw: unknown): DemoWallet {
  const fallback = defaultWallet();
  if (!isDict(raw) || raw.v !== 2 || !isDict(raw.identities)) return fallback;
  const account = ACCOUNT_INDEXES.includes(raw.account as AccountIndex) ? (raw.account as AccountIndex) : 1;
  const identities = { ...fallback.identities };
  const rawIdentities = raw.identities as Record<string, unknown>;
  for (const id of [...ACCOUNT_INDEXES.map(makerId), ...BUYER_IDS]) {
    identities[id] = sanitizeIdentityState(rawIdentities[id]);
  }
  return { v: 2, account, identities, activity: sanitizeActivity(raw.activity) };
}

// ── pure transitions ────────────────────────────────────────────────────────

export function walletConnect(w: DemoWallet, id: IdentityId): DemoWallet {
  const next: DemoWallet = { ...w, identities: { ...w.identities, [id]: { ...w.identities[id], connected: true } } };
  if (!isBuyerId(id)) next.account = accountIndexOf(id);
  return next;
}

export function walletDisconnect(w: DemoWallet, id: IdentityId): DemoWallet {
  return { ...w, identities: { ...w.identities, [id]: { ...w.identities[id], connected: false } } };
}

/**
 * Switch which maker account is active. If the previously active account was
 * connected, the new one keeps that connection — a real wallet's account
 * switch reads the same way, not as a fresh disconnect.
 */
export function walletSwitchAccount(w: DemoWallet, account: AccountIndex): DemoWallet {
  const wasConnected = w.identities[makerId(w.account)]?.connected === true;
  const nextId = makerId(account);
  return {
    ...w,
    account,
    identities: {
      ...w.identities,
      [nextId]: { ...w.identities[nextId], connected: w.identities[nextId]?.connected || wasConnected },
    },
  };
}

export function walletSwitchNetwork(w: DemoWallet, id: IdentityId, network: Network): DemoWallet {
  return { ...w, identities: { ...w.identities, [id]: { ...w.identities[id], network } } };
}

/** Newest first. Activity is NEVER pruned: `balancesOf` sums every charge it holds (C4). */
export function pushActivity(w: DemoWallet, a: WalletActivity): DemoWallet {
  return { ...w, activity: [a, ...w.activity] };
}

// ── storage (guarded; node:test never touches `window`) ────────────────────

export function readWallet(): DemoWallet {
  if (typeof window === "undefined") return defaultWallet();
  try {
    const raw = window.localStorage.getItem(DEMO_WALLET_KEY);
    if (!raw) return defaultWallet();
    return normalizeWallet(JSON.parse(raw));
  } catch {
    return defaultWallet();
  }
}

/** A stored wallet that can't be read back: present, but not JSON or not an object. A v1 or
 *  partial record still normalizes, and is migrated by the next write; a corrupt one isn't, so
 *  its activity — what every balance is derived from — would be wiped. */
export function walletUnreadable(raw: string | null): boolean {
  if (!raw) return false;
  try {
    return !isDict(JSON.parse(raw));
  } catch {
    return true;
  }
}

/** `false` when the browser refused the write — storage full or blocked (P2-MINT-2's alert) — or
 *  when the stored wallet can't be read, which is left exactly as it is, as the market writers do. */
export function writeWallet(w: DemoWallet): boolean {
  if (typeof window === "undefined") return true;
  try {
    if (walletUnreadable(window.localStorage.getItem(DEMO_WALLET_KEY))) return false;
    window.localStorage.setItem(DEMO_WALLET_KEY, JSON.stringify(w));
    return true;
  } catch {
    return false;
  }
}

/** The wallet dialog's "Reset the demo wallet", the way out of an unreadable record that
 *  refuses every write: the default wallet written over it (not connected, fresh test funds).
 *  What it held can't be read, so nothing readable is lost. `false`: the browser refused it. */
export function resetWallet(): boolean {
  if (typeof window === "undefined") return true;
  try {
    window.localStorage.setItem(DEMO_WALLET_KEY, JSON.stringify(defaultWallet()));
    return true;
  } catch {
    return false;
  }
}
