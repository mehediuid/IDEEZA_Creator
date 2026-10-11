// The commercial axis (Build and Earn P1-1): what became of a project as
// something to sell, whatever state its build is in. Its twin is
// `engineeringStateOf` (manual/engineering-state.ts). `projectStatus`
// (manual/project-summary.ts) is this axis in My projects' words.
//
// Pure; relative imports, so node:test loads the compiled module.

import type { StoredDraft } from "../brief/project-brief";
import type { Intent } from "../brief/types";
import type { ListingView, Sale } from "../market/types";
import type { ManualProject } from "../manual/public";
import { projectLockOf } from "./edit-gate";

export type CommercialState = "none" | "minted" | "given" | "listed" | "paused" | "soldPartial" | "soldOut";

export type CommercialFacts = {
  /** The latest Main listing's kind. */
  listing: ListingView["kind"];
  /** Any Main sale of the project exists. */
  mainSale: boolean;
  /** The maker holds none of it any more: the lock (decision 12). */
  soldOut: boolean;
  /** `p.mint`, or the Brief draft's `mintedAt`. */
  minted: boolean;
  intent: Intent | null;
};

/**
 * §3.2's precedence, first match wins:
 * 1. the Main listing is live (Buy now, auction running, or ended and not closed) → listed;
 * 2. it is paused → paused;
 * 3. a Main sale exists → soldOut when the maker holds nothing (the lock), else soldPartial;
 * 4. minted with intent give → given;
 * 5. minted otherwise (sell, save, only removed or closed listings) → minted;
 * 6. none.
 */
export function commercialStateOf(f: CommercialFacts): CommercialState {
  if (f.listing === "live") return "listed";
  if (f.listing === "paused") return "paused";
  if (f.listing === "sold" || f.mainSale) return f.soldOut ? "soldOut" : "soldPartial";
  if (f.minted) return f.intent === "give" ? "given" : "minted";
  return "none";
}

/** The facts, from the project, its Brief draft and the market facts `projectStatus` takes.
 *  Without a listing or sales a project is never listed, paused or sold. */
export function commercialFactsOf(
  p: Pick<ManualProject, "id" | "createdAt" | "contributors" | "mint">,
  draft: StoredDraft | null,
  facts: { listing?: ListingView; sales?: readonly Sale[] } = {},
): CommercialFacts {
  const sales = facts.sales ?? [];
  const mainSale = sales.some((s) => s.projectId === p.id && s.item.nft === "main");
  return {
    listing: facts.listing?.kind ?? "none",
    mainSale,
    soldOut: mainSale && projectLockOf(p, sales) !== null,
    minted: p.mint !== undefined || (draft?.state.mintedAt ?? null) !== null,
    intent: draft?.state.intent ?? null,
  };
}
