// The phone's addresses for what the active demo creator bought (the web's /projects/purchased/<id>, its Earn and
// its pieces, as native screens under /m/projects/purchased/<id>):
// · the purchased project `…/<id>` (`?nft=physical|virtual` opens that kind);
// · a product of it `…/products/<productId>?nft=…` and one of its pieces `…/products/<productId>/<piece>?nft=…`;
// · a copy `…/copies/<copyKey>` and the receipts `…/receipts`;
// · Earn `…/earn`, its Sell `…/earn/sell` and one copy to sell on `…/earn/sell/<tileKey>`;
// · its shop, on the kind asked for (`purchasedShopHref`).
// A whole project bought is the buyer's own project: every way to it opens the project page (CL-038).

import { phoneMarketHref } from "@/lib/manual/phone-earn";
import { phoneProjectHref } from "@/lib/manual/phone-project";
import { wholeProjectIdOf, wholeProjectOnly, type PurchasedProject } from "@/lib/market/purchases";
import type { EditionKind } from "@/lib/market/types";

const enc = encodeURIComponent;

/** A route segment as the address carried it, read back once (a key with `:` and `#` comes encoded). */
export function segmentOf(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export const PURCHASED_TAB_HREF = "/m/projects?tab=purchased";

export const purchasedPath = (id: string, rest = "") => `/m/projects/purchased/${enc(id)}${rest}`;

/** Where a purchase opens on the phone: a whole project bought, its project page; anything else, its purchased screen. */
export function purchasedPhoneHrefOf(p: Pick<PurchasedProject, "id" | "source" | "lines">): string {
  return wholeProjectOnly(p) ? phoneProjectHref(wholeProjectIdOf(p)) : purchasedPath(p.id);
}

export const purchasedKindHref = (id: string, kind: EditionKind | null) => purchasedPath(id, kind ? `?nft=${kind}` : "");
export const copyPath = (id: string, copyKey: string) => purchasedPath(id, `/copies/${enc(copyKey)}`);
export const productPath = (id: string, productId: string, kind: EditionKind) => purchasedPath(id, `/products/${enc(productId)}?nft=${kind}`);
export const piecePath = (id: string, productId: string, piece: string, kind: EditionKind) =>
  purchasedPath(id, `/products/${enc(productId)}/${enc(piece)}?nft=${kind}`);
export const receiptsPath = (id: string) => purchasedPath(id, "/receipts");

export type PurchasedEarnSection = "overview" | "sell";
export const purchasedEarnPath = (id: string, section: PurchasedEarnSection = "overview") => purchasedPath(id, section === "sell" ? "/earn/sell" : "/earn");
export const resaleItemPath = (id: string, tileKey: string) => purchasedPath(id, `/earn/sell/${enc(tileKey)}`);

/**
 * The shop of what was bought, open on one kind's tab (the web's `${p.marketHref}?nft=<kind>` behind Buy another,
 * Buy a copy and See it on Explore marketplace; BUY-5): a Feed sample sells on its own page (`/m/projects/<feedId>`),
 * a listing of this browser on its market screen. Both open their buy box on `?nft=`.
 */
export function purchasedShopHref(p: Pick<PurchasedProject, "id" | "source">, kind: EditionKind | null | undefined): string {
  const base = p.source === "sample" ? `/m/projects/${enc(p.id)}` : phoneMarketHref(p.id);
  return kind ? `${base}?nft=${kind}` : base;
}

/** `?nft=` as a kind, or null. */
export function kindParamOf(raw: string | null | undefined): EditionKind | null {
  return raw === "physical" || raw === "virtual" ? raw : null;
}
