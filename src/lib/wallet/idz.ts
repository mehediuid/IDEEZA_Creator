// IDZ, IDEEZA's own coin, as the Balance pages read it (spec
// 2026-10-19-balance-overview-design.md; Figma User Panel V2 › Balance →
// Overview 41571:126259). One price for every dollar figure (D5), the demo
// contract address per network, and the ledger: the identity's starting
// balance, every wallet activity line that moved IDZ, and the presale's
// purchases and claims (Phase 2). The ledger is read from the same records
// `balancesOf` debits and credits, so the two always agree.
//
// Pure, relative imports only.

import type { Network } from "../brief/types";
import { balancesOf, seedBalancesOf, type BalanceCtx } from "./balances";
import { demoAddress, demoHex } from "./demo-wallet";
import { IDZ_USD_PRICE } from "./idz-price";
import { addAmounts, compareAmounts, formatAmount, toMicros } from "./money";
import { purchaseStatusOf, purchasesOf } from "./presale-records";
import type { Amount, DemoWallet, IdentityId, RequestPurpose, WalletActivity } from "./types";

export { IDZ_USD_PRICE };

export const IDZ_TOKEN = { name: "IDEEZA Coin", symbol: "IDZ", decimals: 18 } as const;

/** The IDZ contract on a demo network: a deterministic Testnet demo address, never a real one. */
export function idzContractOf(network: Network): string {
  return `0x${demoHex(`ideeza:testnet-demo:idz-contract:${network}`, 40)}`;
}

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "$50.13" for 2,000 IDZ; "< $0.01" for a sliver that would round to nothing. */
export function idzUsdOf(amount: Amount): string {
  const units = toMicros(amount) ?? BigInt(0);
  const price = toMicros(IDZ_USD_PRICE) ?? BigInt(0);
  // micros × micros = 10^12 per dollar; to cents, rounded half up.
  const cents = (units * price + BigInt(5_000_000_000)) / BigInt(10_000_000_000);
  if (cents === BigInt(0) && units > BigInt(0)) return "< $0.01";
  return USD.format(Number(cents) / 100);
}

const COMPACT = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

/** "1.8K IDZ" for 1,800.52: the sidebar's wallet button, where the full figure
 *  (in its label and the wallet menu) would squeeze the name beside it. */
export function idzCompactOf(amount: Amount): string {
  const units = toMicros(amount);
  return `${units === null ? amount : COMPACT.format(Number(units) / 1_000_000)} IDZ`;
}

// ── the ledger ──────────────────────────────────────────────────────────

/** D11. Stake and Withdraw join when Stake is built. */
export type TransferType = "reward" | "projectCreate" | "credits" | "buy" | "claim";

export const TRANSFER_TYPES: readonly { value: TransferType; label: string }[] = [
  { value: "reward", label: "Reward" },
  { value: "projectCreate", label: "Project Create" },
  { value: "credits", label: "Credits" },
  { value: "buy", label: "Buy" },
  { value: "claim", label: "Claim" },
];

export function transferTypeLabel(t: TransferType): string {
  return TRANSFER_TYPES.find((x) => x.value === t)?.label ?? t;
}

export type IdzRow = {
  id: string;
  /** null: the starting balance, which has no moment. */
  at: number | null;
  /** null: the starting balance — IDZ is the same on every network. */
  network: Network | null;
  type: TransferType;
  direction: "in" | "out";
  amount: Amount;
  /** "Minted on chain · Car", "Pay for AI credits", "Starting demo balance". */
  title: string;
  txHash: string | null;
  /** The identity's own address: the wallet the IDZ left or reached. */
  address: string;
  projectId?: string;
  /** A presale Buy: the IDZ is the buyer's but the presale holds it until it is claimed, so it
   *  isn't in the balance yet — the Claim row is when it arrives. */
  held?: { unlocksAt: number; claimed: boolean };
};

const PURPOSE_TYPE: Partial<Record<RequestPurpose, TransferType>> = {
  instantMint: "projectCreate",
  upgradeMint: "projectCreate",
  buyCredits: "credits",
  subscribe: "credits",
};

/** Only a mint and a credits or plan payment charge IDZ, so a record from
 *  before `purpose` was kept is one of the two: its title says which. */
function typeOf(a: WalletActivity): TransferType {
  const byPurpose = a.purpose ? PURPOSE_TYPE[a.purpose] : undefined;
  if (byPurpose) return byPurpose;
  return /^Pay for\b/.test(a.title) ? "credits" : "projectCreate";
}

function idzOut(a: WalletActivity): Amount | null {
  const lines = a.charge?.lines.filter((l) => l.coin === "IDZ") ?? [];
  if (!lines.length) return null;
  const sum = addAmounts(...lines.map((l) => l.amount));
  return compareAmounts(sum, "0") > 0 ? sum : null;
}

/** Every IDZ movement of `id`, newest first; the starting balance last. A presale purchase is a
 *  held Buy row, and its claim (the first) a Claim row. */
export function idzLedgerOf(w: DemoWallet | undefined, id: IdentityId): IdzRow[] {
  const address = demoAddress(id);
  const rows: IdzRow[] = [];
  for (const p of purchasesOf(w, id)) {
    rows.push({
      id: p.id,
      at: p.at,
      network: p.network,
      type: "buy",
      direction: "in",
      amount: p.buy.idz,
      title: `Presale ${p.buy.round} · paid ${formatAmount(p.buy.paid.amount, p.buy.paid.coin)}`,
      txHash: p.txHash,
      address,
      held: { unlocksAt: p.buy.unlocksAt, claimed: !!p.claim },
    });
    if (p.claim) {
      rows.push({
        id: p.claim.id,
        at: p.claim.at,
        network: p.network,
        type: "claim",
        direction: "in",
        amount: p.buy.idz,
        title: `Presale ${p.buy.round} · claimed`,
        txHash: p.claim.txHash,
        address,
      });
    }
  }
  for (const a of w?.activity ?? []) {
    if (a.identity !== id || a.purpose === "buyIdz" || a.purpose === "claimIdz") continue;
    const amount = idzOut(a);
    if (!amount) continue;
    const row: IdzRow = {
      id: a.id,
      at: a.at,
      network: a.network,
      type: typeOf(a),
      direction: "out",
      amount,
      title: a.title,
      txHash: a.txHash ?? null,
      address,
    };
    if (a.projectId) row.projectId = a.projectId;
    rows.push(row);
  }
  rows.sort((x, y) => (y.at ?? 0) - (x.at ?? 0));
  const seed = seedBalancesOf(id).idz;
  if (compareAmounts(seed, "0") > 0) {
    rows.push({ id: "seed", at: null, network: null, type: "reward", direction: "in", amount: seed, title: "Starting demo balance", txHash: null, address });
  }
  return rows;
}

export type IdzLedgerFilter = { network: Network | "all"; type: TransferType | "all" };

export function filterIdzLedger(rows: readonly IdzRow[], f: IdzLedgerFilter): IdzRow[] {
  return rows.filter((r) => (f.network === "all" || r.network === f.network) && (f.type === "all" || r.type === f.type));
}

export type IdzHoldings = { available: Amount; staked: Amount; claimable: Amount; pending: Amount };

/** N1: what is free to use, and what the presale holds — Pending while a purchase is locked,
 *  Ready to claim once it unlocks. Staked stays 0 until staking exists. */
export function idzHoldingsOf(w: DemoWallet | undefined, id: IdentityId, ctx: BalanceCtx): IdzHoldings {
  const claimable: Amount[] = [];
  const pending: Amount[] = [];
  for (const p of purchasesOf(w, id)) {
    const status = purchaseStatusOf(p, ctx.now);
    if (status === "claimable") claimable.push(p.buy.idz);
    else if (status === "locked") pending.push(p.buy.idz);
  }
  return {
    available: balancesOf(id, { ...ctx, wallet: w }).idz,
    staked: "0",
    claimable: addAmounts(...claimable),
    pending: addAmounts(...pending),
  };
}

/** "13 Aug 2024, 2:08 PM" — a day, a short month and four digits never read two ways. */
export function formatWhen(at: number): string {
  const d = new Date(at);
  const day = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${day}, ${time}`;
}
