// IDZ, IDEEZA's own coin, as the Balance pages read it (spec
// 2026-10-19-balance-overview-design.md; Figma User Panel V2 › Balance →
// Overview 41571:126259). One price for every dollar figure (D5), the demo
// contract address per network, and the ledger: the identity's starting
// balance and every wallet activity line that moved IDZ. The ledger is read
// from the same records `balancesOf` debits, so the two always agree.
//
// Pure, relative imports only.

import type { Network } from "../brief/types";
import { balancesOf, seedBalancesOf, type BalanceCtx } from "./balances";
import { demoAddress, demoHex } from "./demo-wallet";
import { addAmounts, compareAmounts, toMicros } from "./money";
import type { Amount, DemoWallet, IdentityId, RequestPurpose, WalletActivity } from "./types";

/** The one IDZ price in US dollars (D5: the Figma presale's 1 $IDZ = $0.025065). */
export const IDZ_USD_PRICE = "0.025065";

export const IDZ_TOKEN = { name: "IDEEZA Coin", symbol: "IDZ", decimals: 18 } as const;

/** The IDZ contract on a demo network: a deterministic Testnet demo address, never a real one. */
export function idzContractOf(network: Network): string {
  return `0x${demoHex(`ideeza:testnet-demo:idz-contract:${network}`, 40)}`;
}

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "$1.00" for 40 IDZ; "< $0.01" for a sliver that would round to nothing. */
export function idzUsdOf(amount: Amount): string {
  const units = toMicros(amount) ?? BigInt(0);
  const price = toMicros(IDZ_USD_PRICE) ?? BigInt(0);
  // micros × micros = 10^12 per dollar; to cents, rounded half up.
  const cents = (units * price + BigInt(5_000_000_000)) / BigInt(10_000_000_000);
  if (cents === BigInt(0) && units > BigInt(0)) return "< $0.01";
  return USD.format(Number(cents) / 100);
}

// ── the ledger ──────────────────────────────────────────────────────────

/** D11. Buy, Stake, Withdraw and Claim join when Buy IDZ and Stake are built. */
export type TransferType = "reward" | "projectCreate" | "credits";

export const TRANSFER_TYPES: readonly { value: TransferType; label: string }[] = [
  { value: "reward", label: "Reward" },
  { value: "projectCreate", label: "Project Create" },
  { value: "credits", label: "Credits" },
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

/** Every IDZ movement of `id`, newest first; the starting balance last. */
export function idzLedgerOf(w: DemoWallet | undefined, id: IdentityId): IdzRow[] {
  const address = demoAddress(id);
  const rows: IdzRow[] = [];
  for (const a of w?.activity ?? []) {
    if (a.identity !== id) continue;
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

/** N1: what is free to use, and what staking and buying hold — 0 until they exist. */
export function idzHoldingsOf(w: DemoWallet | undefined, id: IdentityId, ctx: BalanceCtx): IdzHoldings {
  return { available: balancesOf(id, { ...ctx, wallet: w }).idz, staked: "0", claimable: "0", pending: "0" };
}

/** "13 Aug 2024, 2:08 PM" — a day, a short month and four digits never read two ways. */
export function formatWhen(at: number): string {
  const d = new Date(at);
  const day = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${day}, ${time}`;
}
