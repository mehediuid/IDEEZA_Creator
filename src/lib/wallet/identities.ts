// Who the demo wallet can be (Phase 2 spec §3.5.3): the maker's three demo
// accounts and Explore marketplace's three demo buyers, with the seed
// balances each starts from. Handed to MARKETPLACE (P2-MARKETPLACE-3, the
// buyer switch) and CUSTOMERS (the buyer column).
//
// Pure, relative imports only.

import { demoAddress, makerId } from "./demo-wallet";
import type { AccountIndex, DemoBuyerId } from "./types";
import type { Balances } from "./balances";

export type DemoAccount = { index: AccountIndex; label: `Demo account ${AccountIndex}`; address: string };

/** "Demo account 1" · "Demo account 2" · "Demo account 3", with MINT-1's addresses. */
export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  { index: 1, label: "Demo account 1", address: demoAddress(makerId(1)) },
  { index: 2, label: "Demo account 2", address: demoAddress(makerId(2)) },
  { index: 3, label: "Demo account 3", address: demoAddress(makerId(3)) },
];

export type DemoBuyer = { id: DemoBuyerId; name: string; initials: string };

/** Mira, Leo, Sam — Explore marketplace's three demo buyers. */
export const DEMO_BUYERS: readonly DemoBuyer[] = [
  { id: "buyer-mira", name: "Mira", initials: "M" },
  { id: "buyer-leo", name: "Leo", initials: "L" },
  { id: "buyer-sam", name: "Sam", initials: "S" },
];

/** `"Mira (demo buyer)"` — a buyer's name wherever it stands for a real identity, so it never
 *  reads as one (CUSTOMERS, the request dialog, the roster). */
export function buyerLabel(id: DemoBuyerId): string {
  const buyer = DEMO_BUYERS.find((b) => b.id === id);
  return `${buyer ? buyer.name : "Demo buyer"} (demo buyer)`;
}

/** The active buyer for a raw, possibly-stale or invalid stored id. Unknown → Mira. */
export function activeBuyerOf(raw: string | null | undefined): DemoBuyer {
  return DEMO_BUYERS.find((b) => b.id === raw) ?? DEMO_BUYERS[0];
}

/**
 * Every identity's starting balance (P2-MINT-1): the maker gets 40 IDZ, 0.05
 * test ETH on Base Sepolia and 0.5 test MATIC on Mumbai, 0 of the others. A
 * demo buyer gets 0 IDZ and a spread of test tokens on both networks, so a
 * purchase or a bid always has something to spend.
 */
export const SEED_BALANCES: { maker: Balances; buyer: Balances } = {
  maker: {
    idz: "40",
    native: {
      baseSepolia: { ETH: "0.05" },
      mumbai: { MATIC: "0.5" },
    },
  },
  buyer: {
    idz: "0",
    native: {
      baseSepolia: { ETH: "1", WETH: "1", USDC: "500", USDT: "500" },
      mumbai: { MATIC: "10", WETH: "1", USDC: "500", USDT: "500" },
    },
  },
};
