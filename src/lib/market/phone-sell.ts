// Earn › Sell on the phone (mobile Figma "Project Details · 2026 update" 14,
// 15d): the little the phone decides on top of the web's sell flow. The web's
// rules, requests and words stay theirs (sell-flow, editions, listing-flow).
//
// Pure. Value imports are relative, so node:test loads the compiled module.

import type { WalletRequest } from "../wallet/types";
import type { EditionUse } from "./types";

/** The owner's licence words (Personal use / Business use) in place of the buyer pages' older ones,
 *  wherever a shared request or line still says "Private use" / "Commercial use". */
export function plainUseWords(text: string): string {
  return text.replace(/\bPrivate use\b/g, "Personal use").replace(/\bCommercial use\b/g, "Business use");
}

/** A copies request (create, list, add) as the phone's wallet sheet shows it: the owner's licence words. */
export function withUseWords(req: WalletRequest): WalletRequest {
  return {
    ...req,
    title: plainUseWords(req.title),
    summary: req.summary.map((r) => ({ ...r, value: plainUseWords(r.value) })),
    note: plainUseWords(req.note),
    doneLine: plainUseWords(req.doneLine),
  };
}

/** The two uses, Personal first, as Manage lists them (15d). */
export const PHONE_USES: readonly EditionUse[] = ["private", "commercial"];

/**
 * Before a mint, the Sell tab folds the copy rows into one line each (Figma 14): copies use the
 * project's collection and blockchain, so they wait for the mint.
 */
export function preMintCopiesLine(projectName: string, scope: "project" | "products"): string {
  return scope === "project"
    ? `Mint ${projectName} first — its NFTs use the project's collection and blockchain.`
    : `Mint ${projectName} first — product copies use the project's collection too.`;
}
