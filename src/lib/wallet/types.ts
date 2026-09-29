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
};

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
  | "listEdition";

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
  /** The caller's writes, in order (§3.9). */
  commit?: (proof: Proof) => { ok: true } | { ok: false; message: string };
  onUseLazy?: () => void;
};

export type RequestResult =
  | { ok: true; proof: Proof }
  | { ok: false; reason: "rejected" | FailReason; message?: string };
