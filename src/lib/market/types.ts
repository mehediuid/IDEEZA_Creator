// Explore marketplace's shared types (Phase 2 spec §3.3.2): the Main
// listing, its derived view, the one Sale shape (C11), bids, support
// requests and the Physical / Virtual NFT edition tracks. Every record is
// local, labelled "Testnet demo" data (owner decisions 1, 4).
//
// Amounts are `Amount` strings, summed in bigint by `../wallet/money.ts`.
// Types and store keys only, with relative imports.

import type { Network, Token } from "../brief/types";
import type { ProductSource } from "../manual/projects";
import type { Amount, Coin, DemoBuyerId, MintType } from "../wallet/types";

export const LISTINGS_KEY = "ideeza:market:listings";
export const SALES_KEY = "ideeza:market:sales";
export const BIDS_KEY = "ideeza:market:bids";
export const SUPPORT_KEY = "ideeza:market:support";
export const ACTIVE_BUYER_KEY = "ideeza:market:buyer";
export const EDITIONS_KEY = (projectId: string) => `ideeza:project:editions:${projectId}`;

export type UtilityBenefit = {
  id: string;
  name: string;
  duration: { months: 1 | 3 | 6 | 12 } | { whileHeld: true };
};

export type ListingChange = "rename" | "description" | "cover" | "addProduct" | "editProduct" | "dropProduct";

export type ListingMetadata = {
  name: string;
  description: string;
  products: { id: string; name: string }[];
  cover: ProductSource | null;
  at: number;
};

export type ListingEvent =
  | { kind: "listed" | "relisted" | "removed" | "closed"; at: number }
  | { kind: "updated"; at: number; price?: string }
  | { kind: "paused"; at: number; changes: ListingChange[] };

export type Listing = {
  id: string;
  projectId: string;
  slot: "main";
  source: "page" | "brief";
  listedAt: number;
  updatedAt: number;
  type: "buyNow" | "auction";
  token: Token;
  price?: Amount;
  minBid?: Amount;
  auctionBuyNow?: Amount;
  endsAt?: number;
  percentSelling: number;
  royaltiesPct: number;
  mintingType: MintType;
  network: Network;
  collection: string;
  benefits: UtilityBenefit[];
  metadata: ListingMetadata;
  /** Stored; a Sale naming it reads "sold". */
  status: "live" | "paused" | "removed" | "closed";
  pause?: { at: number; changes: ListingChange[] };
  endedAt?: number;
  events: ListingEvent[];
};

export type AuctionPhase = "running" | "endingSoon" | "ended";
export type AuctionState = { phase: AuctionPhase; top: Bid | null; minNext: Amount; msLeft: number };

export type ListingView =
  | { kind: "none" }
  /** No onMarket (C5). */
  | { kind: "live"; listing: Listing; auction: AuctionState | null }
  | { kind: "paused"; listing: Listing; changed: string[] }
  /** `unpaid`: closed with bids, none of which could be paid (the Close skipped them all). */
  | { kind: "ended"; listing: Listing; why: "removed" | "noBids"; unpaid?: true }
  | { kind: "sold"; listing: Listing; sale: Sale };

export type EditionKind = "physical" | "virtual";
export type EditionUse = "private" | "commercial";

/** TABS P2-TABS-24…27. */
export type EditionTrack = {
  id: string;
  projectId: string;
  productId: string;
  kind: EditionKind;
  use: EditionUse;
  supply: { total: number; lastAdded?: { n: number; at: number } };
  createdAt: number;
  lazy: true;
  listing: null | {
    token: Token;
    regular: Amount;
    extended: Amount;
    royaltyPct: number;
    listedAt: number;
    updatedAt: number;
  };
  demo: true;
};

export type SaleItem =
  | { nft: "main"; sharePct: number }
  | {
      nft: EditionKind;
      trackId: string;
      productId: string;
      productName: string;
      use: EditionUse;
      tier: "regular" | "extended";
      serial: number;
    };

/** ONE record per purchase (C11). */
export type Sale = {
  id: string;
  /** Main: Listing.id; edition: EditionTrack.id. */
  listingId: string;
  projectId: string;
  at: number;
  buyerId: DemoBuyerId;
  buyerAddress: string;
  sellerAddress: string;
  item: SaleItem;
  via: "buyNow" | "auctionBuyNow" | "auctionWin";
  token: Token;
  price: Amount;
  fees: { ideezaBps: number; ideeza: Amount; network: { coin: Coin; amount: Amount } };
  /** price − fees.ideeza, to sellerAddress. */
  payout: Amount;
  royaltiesPct: number;
  mint: MintType;
  mintedAtSale: boolean;
  tokenId: number | null;
  network: Network;
  collection: string;
  benefits: UtilityBenefit[];
  txHash: string;
  demo: true;
};

export type Bid = { id: string; listingId: string; bidderId: DemoBuyerId; amount: Amount; token: Token; at: number };

export type SupportRequest = {
  id: string;
  saleId: string;
  projectId: string;
  buyerId: DemoBuyerId;
  message: string;
  at: number;
};

export type MarketData = {
  listings: Listing[];
  sales: Sale[];
  bids: Bid[];
  support: SupportRequest[];
  /** Any market key present but unparsable. */
  unreadable: boolean;
};
