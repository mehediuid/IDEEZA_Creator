// success-copy.ts — Step 4's pure copy (COM-21). Showcase, including any
// Innovations post, is the project's own flag (COR-105, set from the
// Outcome row or this step's own Showcase control); no line claims a post
// that hasn't happened, and Give's "Your community can claim it." is
// dropped — nothing here promises what the app can't back yet.
//
// A Sell commit writes the listing itself (P2-LISTING-22, as changed in
// spec §4.5), and the readiness gate is strict (C5): every product's video
// is ready before a Sell or a Give can commit. So a sale has only the live
// line, and only a Save can arrive here with a video still rendering.
import type { Intent } from "./types";

/** P2-LISTING-22 (C): the Sell success line, and its one link. */
export const LISTED_LINE = "Your project is listed on Explore marketplace — a testnet demo.";
export const VIEW_ON_MARKETPLACE = "View on marketplace";
/** Under the listing's terms on a minted sale (P2-LISTING-22). */
export const LISTING_HOME_NOTE = "Change the price or remove the listing from the project's Marketplace block.";

export function liveSubline(intent: Intent, hasClip: boolean): string {
  return intent === "sell"
    ? LISTED_LINE
    : intent === "give"
      ? hasClip
        ? "Your videos are final and the drop is open."
        : "The drop is open."
      : "Stored in your library. Pick it up any time.";
}

/** A Save minted while its videos still render — what happens without you. */
export function pendingSubline(): string {
  return "Stored in your library. Its videos keep rendering — you can leave this page.";
}

/** The line in the pending card, while a Save's videos still render. */
export function pendingCardLine(rendering: number): string {
  return rendering === 1
    ? "1 video is still rendering. It lands on the project's Media tab when it finishes."
    : `${rendering} videos are still rendering. They land on the project's Media tab when they finish.`;
}

/** P2-VIDEO-16: the Showcase line while the readiness gate is blocked. */
export function showcaseGateLine(ready: number, total: number): string {
  return `Every product needs an AI video first — ${ready} of ${total} have one.`;
}
