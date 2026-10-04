// What the Demo wallet dialog and its menu entry say (P2-MINT-2, P2-MINT-3,
// P2-MINT-5, P2-MARKETPLACE-13 as changed in spec §4). `request.ts` holds the
// phase gate and the phase copy; this module holds the words that need the
// FULL picture — the wallet AND the marketplace — which `requestCopy` can't
// see (contract errata 29: its affordability lines read wallet activity only,
// so a buyer's purchases, a seller's payouts and a live auction's held top
// bid were missing from "you have …").
//
// Also here: the labelled charge rows, "Balance after", the activity line a
// confirmed request leaves, the demo signature and transaction hash, and the
// menu entry's title and hint. The dialog (T13) renders these; it invents
// none of its own copy.
//
// Pure, relative imports only (node:test loads the compiled module).

import { estimateGas } from "../brief/gas";
import { NETWORKS, type Network, type Token } from "../brief/types";
import { formatDateTime } from "../manual/project-summary";
import { affordOf, balancesOf, type BalanceCtx } from "./balances";
import { demoAddress, demoHex, makerId, shortAddress } from "./demo-wallet";
import { DEMO_ACCOUNTS, buyerLabel } from "./identities";
import { gateOf } from "./request";
import { walletFactOf, mintChargeOf } from "./mint";
import { addAmounts, compareAmounts, formatAmount, normalizeAmount, subAmounts } from "./money";
import type {
  AccountIndex,
  Amount,
  Charge,
  ChargeLine,
  Coin,
  DemoBuyerId,
  DemoWallet,
  IdentityId,
  MintType,
  Proof,
  RequestPurpose,
  WalletActivity,
  WalletRequest,
} from "./types";

export function networkLabelOf(n: Network): string {
  return NETWORKS.find((x) => x.value === n)?.label ?? n;
}

function isMaker(id: IdentityId): boolean {
  return id.startsWith("maker-");
}

function accountOf(id: IdentityId): AccountIndex | null {
  return isMaker(id) ? (Number(id.slice("maker-".length)) as AccountIndex) : null;
}

/** "0.05" → "0.05 test ETH". IDZ is IDEEZA's own token, never "test". */
export function testCoin(amount: Amount, coin: Coin): string {
  if (coin === "IDZ") return formatAmount(amount, coin);
  return `${normalizeAmount(amount) ?? amount} test ${coin}`;
}

function plain(amount: Amount): string {
  return normalizeAmount(amount) ?? amount;
}

// ── who signs ────────────────────────────────────────────────────────────

/**
 * The identity a request signs as. A buyer signs as named; "maker" is the
 * request's required signer (`account`, a payout change) or the maker's
 * current account.
 */
export function requestIdentityOf(req: WalletRequest, w: DemoWallet | undefined): IdentityId {
  if (req.identity !== "maker") return req.identity;
  return makerId(req.account ?? w?.account ?? 1);
}

export type RequestGate = "connect" | "wrongNetwork" | "review" | "accountChanged";

/**
 * `gateOf`, plus the required signer: a request pinned to an account the
 * wallet has since switched away from (another tab) can't be signed by it,
 * so it fails as `accountChanged` instead of signing with the wrong key.
 */
export function requestGateOf(req: WalletRequest, w: DemoWallet | undefined): RequestGate {
  if (req.identity === "maker" && req.account !== undefined && (w?.account ?? 1) !== req.account) {
    return "accountChanged";
  }
  return gateOf(req, w);
}

/** "Demo account 1" · "Mira (demo buyer)". */
export function identityLabelOf(id: IdentityId): string {
  const account = accountOf(id);
  if (account !== null) return DEMO_ACCOUNTS.find((a) => a.index === account)?.label ?? `Demo account ${account}`;
  return buyerLabel(id as DemoBuyerId);
}

/**
 * The request dialog's header strip (P2-MINT-3): "Connected: 0x955d…ed95 ·
 * Demo account 1 · Base Sepolia (Testnet)", or "Not connected · Demo account
 * 1" before the connect step.
 */
export function connectionLineOf(id: IdentityId, w: DemoWallet | undefined): string {
  const state = w?.identities[id];
  if (!state?.connected) return `Not connected · ${identityLabelOf(id)}`;
  return `Connected: ${shortAddress(demoAddress(id))} · ${identityLabelOf(id)} · ${networkLabelOf(state.network)}`;
}

// ── the charge ───────────────────────────────────────────────────────────

/**
 * The charge with same-coin lines summed, in first-seen order. `affordOf`
 * checks one line at a time, so a purchase's price and network fee in the
 * same coin must be one line, or 9.99 + 0.021 MATIC would pass on a
 * balance of 10.
 */
export function sumCharge(charge: Charge): Charge {
  const lines: ChargeLine[] = [];
  for (const line of charge.lines) {
    const at = lines.findIndex((l) => l.coin === line.coin);
    if (at === -1) lines.push({ coin: line.coin, amount: plain(line.amount) });
    else lines[at] = { coin: line.coin, amount: addAmounts(lines[at].amount, line.amount) };
  }
  return { network: charge.network, lines };
}

const MINT_PURPOSES: readonly RequestPurpose[] = ["lazyMint", "instantMint", "upgradeMint"];

export type ChargeRow = { label: string; value: string; note?: string };

/**
 * A transaction's charge as labelled rows (P2-MINT-5's order): the mint fee,
 * the network fee (named for its chain, "test ETH — no real cost"), then any
 * other line (a price), and the total. Null for a signature.
 */
export function chargeRowsOf(req: WalletRequest): { rows: ChargeRow[]; total: string } | null {
  if (req.kind !== "transaction" || !req.charge || !req.charge.lines.length) return null;
  const gas = estimateGas(req.charge.network);
  const fee = String(gas.fee);
  let feeSeen = false;
  const rows: ChargeRow[] = req.charge.lines.map((line) => {
    if (line.coin === "IDZ") {
      return { label: MINT_PURPOSES.includes(req.purpose) ? "Mint fee" : "IDEEZA token", value: formatAmount(line.amount, "IDZ") };
    }
    if (!feeSeen && line.coin === gas.native && compareAmounts(line.amount, fee) === 0) {
      feeSeen = true;
      return { label: gas.label, value: formatAmount(line.amount, line.coin), note: gas.note };
    }
    return { label: req.purpose === "purchase" ? "Price" : "Amount", value: formatAmount(line.amount, line.coin) };
  });
  const total = sumCharge(req.charge)
    .lines.map((l) => formatAmount(l.amount, l.coin))
    .join(" + ");
  return { rows, total };
}

export type Shortfall = { coin: Coin; have: Amount; need: Amount; text: string };

/**
 * What `identity` is short of for the whole charge right now, read from the
 * wallet AND the marketplace (errata 29), or null when it can pay (or the
 * request charges nothing):
 * - "Not enough IDZ — you have 2 IDZ, this needs 4 IDZ."
 * - "Not enough test ETH for the network fee — you have 0.0003 ETH, this needs 0.00104 ETH."
 * - "Not enough test MATIC — you have 9 MATIC, this needs 10.021 MATIC." (a price)
 * A purchase naming the listing it `releases` counts its buyer's own hold on
 * that auction back in (R1-3); so does "Balance after".
 */
export function shortfallOf(req: WalletRequest, identity: IdentityId, ctx: BalanceCtx): Shortfall | null {
  if (req.kind !== "transaction" || !req.charge) return null;
  const charge = sumCharge(req.charge);
  const r = affordOf(identity, charge, ctx, { releasing: req.releases });
  if (r.ok) return null;
  const gas = estimateGas(charge.network);
  const have = formatAmount(r.have, r.short);
  const need = formatAmount(r.need, r.short);
  let text: string;
  if (r.short === "IDZ") text = `Not enough IDZ — you have ${have}, this needs ${need}.`;
  else if (r.short === gas.native && compareAmounts(r.need, String(gas.fee)) === 0) {
    text = `Not enough test ${r.short} for the network fee — you have ${have}, this needs ${need}.`;
  } else text = `Not enough test ${r.short} — you have ${have}, this needs ${need}.`;
  return { coin: r.short, have: plain(r.have), need: plain(r.need), text };
}

/** `insufficientFunds` at Confirm: "Your balance changed — you now have 2 IDZ." */
export function balanceChangedLine(short: Shortfall): string {
  return `Your balance changed — you now have ${formatAmount(short.have, short.coin)}.`;
}

/** "36 IDZ · 0.04896 ETH": each charged coin after the charge, IDZ first, from the full market. */
export function balanceAfterOf(req: WalletRequest, identity: IdentityId, ctx: BalanceCtx): string | null {
  if (req.kind !== "transaction" || !req.charge) return null;
  const charge = sumCharge(req.charge);
  const bal = balancesOf(identity, ctx, { releasing: req.releases });
  const lines = [...charge.lines].sort((a, b) => (a.coin === "IDZ" ? -1 : b.coin === "IDZ" ? 1 : 0));
  return lines
    .map((l) => {
      const have = l.coin === "IDZ" ? bal.idz : (bal.native[charge.network]?.[l.coin as Token] ?? "0");
      return formatAmount(subAmounts(have, l.amount), l.coin);
    })
    .join(" · ");
}

// ── balances, for the manage view ───────────────────────────────────────

/** "40 IDZ · 0.05 test ETH": IDZ, then the network's own coin (test MATIC on Mumbai). */
export function balanceLineOf(id: IdentityId, network: Network, ctx: BalanceCtx): string {
  const bal = balancesOf(id, ctx);
  const coin = estimateGas(network).native;
  return `${formatAmount(bal.idz, "IDZ")} · ${testCoin(bal.native[network]?.[coin] ?? "0", coin)}`;
}

/** "Demo account 2 · 0x2b10…3c00 · 40 IDZ" — one row of the Account radiogroup. */
export function accountRowOf(index: AccountIndex, ctx: BalanceCtx): string {
  const account = DEMO_ACCOUNTS.find((a) => a.index === index) ?? DEMO_ACCOUNTS[0];
  const idz = balancesOf(makerId(index), ctx).idz;
  return `${account.label} · ${shortAddress(account.address)} · ${formatAmount(idz, "IDZ")}`;
}

/** "Mira · 0x68f4…c94e · 1 test ETH" — a demo buyer's row, on the network that buyer's wallet is on. */
export function buyerRowOf(id: DemoBuyerId, name: string, w: DemoWallet | undefined, ctx: BalanceCtx): string {
  const network = w?.identities[id]?.network ?? "baseSepolia";
  const coin = estimateGas(network).native;
  const bal = balancesOf(id, ctx);
  return `${name} · ${shortAddress(demoAddress(id))} · ${testCoin(bal.native[network]?.[coin] ?? "0", coin)}`;
}

/** One Recent line: "Minted on chain · Car · Sep 28, 2026 · 4:12 PM", and its charge "−4 IDZ, −0.00104 ETH". */
export function activityLineOf(a: WalletActivity): { text: string; charge: string | null } {
  const charge = a.charge?.lines.length
    ? sumCharge(a.charge).lines.map((l) => `−${formatAmount(l.amount, l.coin)}`).join(", ")
    : null;
  return { text: `${a.title} · ${formatDateTime(a.at)}`, charge };
}

/** The newest `n` lines of one identity's activity (activity is stored newest first). */
export function recentOf(w: DemoWallet | undefined, id: IdentityId, n = 3): WalletActivity[] {
  return (w?.activity ?? []).filter((a) => a.identity === id).slice(0, n);
}

// ── the menu entry (P2-MINT-2) ──────────────────────────────────────────

export type MenuEntryText = { title: string; detail: string | null; demo: boolean };

/**
 * | not read     | "Wallet"                  | —                                                      |
 * | disconnected | "Connect wallet"          | "Testnet demo"                                         |
 * | connected    | "Connected: 0x955d…ed95"  | "Demo account 1 · Base Sepolia (Testnet) · Testnet demo" |
 * `detail` is the hint before the "Testnet demo" pill, which `demo` asks for.
 */
export function menuEntryOf(w: DemoWallet | undefined): MenuEntryText {
  if (!w) return { title: "Wallet", detail: null, demo: false };
  const id = makerId(w.account);
  const state = w.identities[id];
  if (!state?.connected) return { title: "Connect wallet", detail: null, demo: true };
  return {
    title: `Connected: ${shortAddress(demoAddress(id))}`,
    detail: `${identityLabelOf(id)} · ${networkLabelOf(state.network)}`,
    demo: true,
  };
}

// ── what a confirmed request leaves behind ──────────────────────────────

const ACTIVITY_VERB: Record<RequestPurpose, string> = {
  lazyMint: "Signed a lazy mint",
  instantMint: "Minted on chain",
  upgradeMint: "Minted on chain",
  list: "Signed a listing",
  editListing: "Signed a listing change",
  removeListing: "Removed a listing",
  relist: "Signed a relisting",
  changePayout: "Re-signed the lazy mint",
  purchase: "Bought",
  bid: "Placed a bid",
  createEditions: "Created editions",
  listEdition: "Signed an edition listing",
};

/** "Minted on chain · Car": the verb for the purpose, then the request's "Project" row (else its title). */
export function activityTitleOf(req: WalletRequest): string {
  const project = req.summary.find((r) => r.label === "Project")?.value;
  return project ? `${ACTIVITY_VERB[req.purpose]} · ${project}` : req.title;
}

/**
 * The activity line a confirmed request writes — the LAST write, after the
 * caller's own records (§3.9). Its `charge` is the debit balances read.
 * A purchase's price and network fee are debited by its `Sale` instead
 * (`balancesOf` reads sales), so a purchase's line carries no charge:
 * recording it here as well would spend it twice.
 */
export function activityOf(req: WalletRequest, proof: Proof, id: string, projectId?: string): WalletActivity {
  const entry: WalletActivity = {
    id,
    at: proof.at,
    identity: proof.identity,
    network: req.network,
    kind: req.kind,
    title: activityTitleOf(req),
  };
  if (projectId) entry.projectId = projectId;
  if (proof.txHash) entry.txHash = proof.txHash;
  if (proof.signature) entry.signature = proof.signature;
  if (req.kind === "transaction" && req.charge && req.purpose !== "purchase") entry.charge = sumCharge(req.charge);
  return entry;
}

/** A demo transaction hash: "0x" + 64 hex, deterministic for its seed, never a link (§3.1). */
export function demoTxHashOf(seed: string): string {
  return `0x${demoHex(`ideeza:testnet-demo:tx:${seed}`, 64)}`;
}

/** A demo signature: "0x" + 130 hex (65 bytes), deterministic for its seed. */
export function demoSignatureOf(seed: string): string {
  return `0x${demoHex(`ideeza:testnet-demo:sig:${seed}`, 130)}`;
}

/** The proof a confirmed request resolves with: who signed, from which address, when, and the hash. */
export function proofOf(req: WalletRequest, identity: IdentityId, at: number, hash: string): Proof {
  const address = demoAddress(identity);
  return req.kind === "signature" ? { identity, address, at, signature: hash } : { identity, address, at, txHash: hash };
}

// ── the wallet fact line, with the full picture (P2-MINT-5) ─────────────

export type MintShortfall = { coin: Coin; have: Amount; need: Amount; line: string; missing: string };

/**
 * Whether the maker's current account can pay an instant mint on `network`,
 * from the wallet AND the marketplace (a seller's payouts count). Null for a
 * lazy mint, before the wallet is read, or when it can pay. `line` is the
 * fact line's warning; `missing` is the Brief's firstMissing reason.
 */
export function mintShortfallOf(
  w: DemoWallet | undefined,
  type: MintType,
  network: Network,
  ctx: Omit<BalanceCtx, "wallet">,
): MintShortfall | null {
  if (!w || type !== "instant") return null;
  const charge = mintChargeOf("instant", network);
  if (!charge) return null;
  const r = affordOf(makerId(w.account), charge, { ...ctx, wallet: w });
  if (r.ok) return null;
  const tail = "Lazy mint costs nothing now, or switch demo account in your wallet.";
  if (r.short === "IDZ") {
    return {
      coin: r.short,
      have: plain(r.have),
      need: plain(r.need),
      line: `Not enough IDZ for an instant mint — you have ${plain(r.have)}, it needs ${plain(r.need)}. ${tail}`,
      missing: "Not enough IDZ for an instant mint — choose Lazy mint or switch demo account.",
    };
  }
  return {
    coin: r.short,
    have: plain(r.have),
    need: plain(r.need),
    line: `Not enough test ${r.short} for an instant mint's network fee — you have ${plain(r.have)}, it needs ${plain(r.need)}. ${tail}`,
    missing: `Not enough test ${r.short} for an instant mint — choose Lazy mint or switch demo account.`,
  };
}

/**
 * `WalletFactLine`'s words. `walletFactOf` (T02) decides the heading and the
 * disconnected / wrong-network lines; this adds what it can't see: the
 * balance on a connected instant mint ("Demo account 1 · 0x955d…ed95 ·
 * Balance 40 IDZ · 0.05 ETH") and the can't-afford warning, both read from
 * the full market.
 */
export function walletFactLineOf(
  w: DemoWallet | undefined,
  f: { type: MintType; network: Network },
  ctx: Omit<BalanceCtx, "wallet">,
): { heading: string; line: string; tone: "info" | "warning" } {
  const base = walletFactOf(w, f);
  if (!w || f.type !== "instant") return base;
  const short = mintShortfallOf(w, f.type, f.network, ctx);
  if (short) return { heading: base.heading, line: short.line, tone: "warning" };
  const id = makerId(w.account);
  const state = w.identities[id];
  if (!state?.connected || state.network !== f.network) return base;
  const bal = balancesOf(id, { ...ctx, wallet: w });
  const coin = estimateGas(f.network).native;
  const account = DEMO_ACCOUNTS.find((a) => a.index === w.account) ?? DEMO_ACCOUNTS[0];
  return {
    heading: base.heading,
    line: `${account.label} · ${shortAddress(account.address)} · Balance ${formatAmount(bal.idz, "IDZ")} · ${formatAmount(bal.native[f.network]?.[coin] ?? "0", coin)}`,
    tone: "info",
  };
}
