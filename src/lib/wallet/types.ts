// The demo wallet's shared types (Phase 2 spec §3.3.1). One store,
// `ideeza:wallet:demo` v2, holds six identities: the maker's three demo
// accounts and the three demo buyers of Explore marketplace (C4). Nothing
// here touches a chain: every signature and transaction is a local, labelled
// "Testnet demo" record (owner decision 1).
//
// Money is an `Amount`: a decimal string of units, parsed into bigint micros
// by `./money.ts` for every sum, so no float ever carries a price (§3.1).
//
// Types only, with relative imports, so node:test and every later task read
// the same contract.

import type { Network, Token } from "../brief/types";

export type AccountIndex = 1 | 2 | 3;
export type MakerId = `maker-${AccountIndex}`;
export type DemoBuyerId = "buyer-mira" | "buyer-leo" | "buyer-sam";
export type IdentityId = MakerId | DemoBuyerId;
export type Coin = Token | "IDZ";
/** Decimal units, at most 6 decimal places, e.g. "0.00104". */
export type Amount = string;
export type ChargeLine = { coin: Coin; amount: Amount };
export type Charge = { network: Network; lines: ChargeLine[] };

export type WalletActivity = {
  id: string;
  at: number;
  identity: IdentityId;
  network: Network;
  kind: "signature" | "transaction";
  /** "Minted on chain · Car" */
  title: string;
  projectId?: string;
  txHash?: string;
  signature?: string;
  charge?: Charge;
  /** What the request was for. Records older than the Balance page have none
   *  (the IDZ ledger then reads the title). */
  purpose?: RequestPurpose;
  /** A presale purchase (`buyIdz`): what it bought, held until it unlocks. */
  presale?: PresaleBuy;
  /** A claim (`claimIdz`): the id of the purchase whose IDZ it releases. */
  claims?: string;
};

/**
 * What one presale purchase bought (Balance › Buy IDZ Token). Its activity
 * line's charge is the coin paid plus the purchase's gas; the IDZ here stays
 * with the presale until `unlocksAt`, then a claim moves it into the balance.
 */
export type PresaleBuy = {
  idz: Amount;
  /** The coin and amount paid for it, without the gas. */
  paid: ChargeLine;
  /** Its worth in US dollars at the coin's rate: what "Total USD raised" sums. */
  usd: Amount;
  /** US dollars per IDZ, after any whitelist discount. */
  price: Amount;
  round: string;
  whitelisted: boolean;
  unlocksAt: number;
};

/** A purchase before it confirms: the lock is counted from the moment it does. */
export type PresaleDraft = Omit<PresaleBuy, "unlocksAt"> & { lockMs: number };

export type DemoWallet = {
  v: 2;
  /** The maker's chosen account. */
  account: AccountIndex;
  identities: Record<IdentityId, { connected: boolean; network: Network }>;
  /** Newest first. NEVER pruned: balances are derived from it (C4). */
  activity: WalletActivity[];
};

export type MintType = "lazy" | "instant";
export type MintStatus = "notMinted" | "lazyMinted" | "onChain" | "legacy";

export type MintRecord = {
  v: 1;
  demo: true;
  type: MintType;
  network: Network;
  collection: string;
  tokenId: number;
  /** The payout wallet. */
  wallet: { account: AccountIndex; address: string };
  at: number;
  signedAt?: number;
  signature?: string;
  onChain?: { at: number; txHash: string; via: "instant" | "upgrade"; charge?: Charge };
  walletChanges?: { at: number; from: string; to: string }[];
};

export type MintView = {
  status: MintStatus;
  record: MintRecord | null;
  tokenId: number | null;
  /** Derived from the first Main sale, never written (C12). */
  settled: { at: number; txHash: string; via: "sale" } | null;
};

export type SummaryRow = { label: string; value: string };

export type RequestPurpose =
  | "lazyMint"
  | "instantMint"
  | "upgradeMint"
  | "list"
  | "editListing"
  | "removeListing"
  | "relist"
  | "changePayout"
  | "purchase"
  | "bid"
  | "createEditions"
  | "listEdition"
  /** AI credits paid from the demo wallet (Buy credits). */
  | "buyCredits"
  /** A plan paid from the demo wallet (Plan & billing). */
  | "subscribe"
  /** Earnings withdrawn in Settings › Get paid: a signature, nothing charged. */
  | "withdraw"
  /** A withdrawal method added or made the default in Settings › Get paid: a signature. */
  | "payoutMethod"
  /** IDZ bought in the demo presale (Balance › Buy IDZ Token). */
  | "buyIdz"
  /** A presale purchase's IDZ claimed once it unlocks. */
  | "claimIdz";

export type WalletRequest = {
  kind: "signature" | "transaction";
  purpose: RequestPurpose;
  /** "maker" = the maker's current account. */
  identity: "maker" | DemoBuyerId;
  network: Network;
  title: string;
  summary: SummaryRow[];
  note: string;
  doneLine: string;
  /** Transaction only. */
  charge?: Charge;
  /** A required signer (changePayout). */
  account?: AccountIndex;
  /** A purchase that ends this listing (an auction's Buy now): the buyer's own
   *  held top bid on it pays toward the charge (R1-3). */
  releases?: string;
  /** `buyIdz`: what the confirmed line records as its purchase. */
  presale?: PresaleDraft;
  /** `claimIdz`: the purchase it claims. */
  claims?: string;
};

export type RequestPhase =
  | "connect"
  | "connecting"
  | "wrongNetwork"
  | "switching"
  | "review"
  | "signing"
  | "pending"
  | "confirmed"
  | "rejected"
  | "failed";

export type FailReason =
  | "walletDisconnected"
  | "networkChanged"
  | "accountChanged"
  | "insufficientFunds"
  | "storageFailed"
  | "recheck";

export type Proof = { identity: IdentityId; address: string; at: number; signature?: string; txHash?: string };

export type RequestOptions = {
  /** Runs just before confirming; a string fails the request with that copy. */
  recheck?: () => string | null;
  /** The caller's writes, in order (§3.9). `conflict`: the market moved under the request (just
   *  sold, sold out, taken off), so Try again can't help and the dialog offers Close only
   *  (MARKETPLACE-14). */
  commit?: (proof: Proof) => { ok: true } | { ok: false; message: string; conflict?: boolean };
  onUseLazy?: () => void;
};

export type RequestResult =
  | { ok: true; proof: Proof }
  | { ok: false; reason: "rejected" | FailReason; message?: string };
