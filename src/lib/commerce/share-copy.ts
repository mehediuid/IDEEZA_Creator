// The words for selling a share of a project (Build and Earn P1-4). Wherever
// a share is sold (the listing fields in the Brief and on the page, the
// listing requests, the Marketplace block, the buyer's rail, the purchase and
// the bid), the copy promises no return or profit, carries the one fixed note
// below, and calls royalties what they are on a testnet: a share of resales,
// if marketplaces honour it. One home, so the surfaces can't drift apart.
//
// Pure, no imports.

export const SHARE_SALE_NOTE =
  "Demo on a testnet. Selling a share of a project can be regulated as an investment where you live; this is not available for real money.";

/** Royalties, said plainly: nothing guarantees them. */
export const ROYALTY_MEANING = "A share of resales, if marketplaces honour it.";

/** A listing's royalty as a fact: "5% · a share of resales, if marketplaces honour it". */
export function royaltyText(pct: number | string): string {
  return `${pct}% · a share of resales, if marketplaces honour it`;
}
