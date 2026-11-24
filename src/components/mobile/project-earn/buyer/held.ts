// What a demo creator holds NOW of this browser's own listings (CL-036): a copy is whoever bought it
// last — from its creator or from another holder (lib/market/resales.ts) — so a copy sold on is no
// longer the seller's, and one bought from a holder is the buyer's although its first Sale names
// someone else. The phone's shop screens count "you own n" from here, as the web's copy-panel.tsx does.
//
// Pure.

import { ownSaleKeyOf } from "@/lib/market/purchases";
import { holderOf, type Resale } from "@/lib/market/resales";
import type { Sale } from "@/lib/market/types";
import type { DemoBuyerId } from "@/lib/wallet/types";

type CopySale = Sale & { item: Exclude<Sale["item"], { nft: "main" }> };

/** The copy sales whose copy `buyerId` holds now, newest first; `keep` narrows them (one track, one product). */
export function heldCopiesOf(sales: readonly Sale[], buyerId: DemoBuyerId, resales: readonly Resale[], keep?: (s: CopySale) => boolean): CopySale[] {
  return sales
    .filter((s): s is CopySale => s.item.nft !== "main")
    .filter((s) => (!keep || keep(s)) && holderOf(ownSaleKeyOf(s) ?? s.id, s.buyerId, resales) === buyerId)
    .sort((a, b) => b.at - a.at);
}
