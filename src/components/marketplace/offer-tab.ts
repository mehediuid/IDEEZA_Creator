// The Marketplace box's tab a link asks for: `?nft=main|physical|virtual` (owner, 2026-11-16: a card's tags are
// clickable, and the details page opens on the one clicked). Anything else asks for nothing. Server-safe.

import type { OfferTab } from "./offer-parts";

export const NFT_PARAM = "nft";

export function offerTabOf(raw: string | null | undefined): OfferTab | null {
  return raw === "main" || raw === "physical" || raw === "virtual" ? raw : null;
}
