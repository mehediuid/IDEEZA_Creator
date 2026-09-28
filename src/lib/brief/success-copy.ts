// success-copy.ts — Step 4's pure copy (COM-21). Showcase, including any
// Innovations post, is the project's own flag (COR-105, set from the
// Outcome row or this step's own Showcase control); neither the live nor
// the pending line claims a post that hasn't happened, and Give's "Your
// community can claim it." is dropped — nothing here promises what the app
// can't back yet.
import type { Intent } from "./types";

export function liveSubline(intent: Intent, hasClip: boolean): string {
  // Until the Brief's Sell writes the listing itself (P2-LISTING-22, T26), a Sell mint reads
  // Private on its page, where Add to marketplace lists it (P2-LISTING-24).
  return intent === "sell"
    ? hasClip
      ? "Your video is final and your project is minted. Add it to Explore marketplace from its page."
      : "Your project is minted. Add it to Explore marketplace from its page."
    : intent === "give"
      ? hasClip
        ? "Your video is final and the drop is open."
        : "The drop is open."
      : "Stored in your library. Pick it up any time.";
}

/** Minted, with the render still running — what happens without you. */
export function pendingSubline(intent: Intent): string {
  return intent === "sell"
    ? "Your project is minted. Add it to Explore marketplace from its page once its video finishes."
    : intent === "give"
      ? "We’ll open the drop the moment the video finishes — no extra action needed."
      : "Stored in your library. Pick it up any time.";
}

/** The line under the storyboard, while the render is still running. */
export function pendingCardLine(intent: Intent, quality: string): string {
  const clip = `your ${quality} 10s video`;
  if (intent === "sell") return `Your project is minted — its video lands as soon as ${clip} finishes.`;
  if (intent === "give") return `The drop opens as soon as ${clip} finishes.`;
  return `It is replaced by ${clip} as soon as that finishes.`;
}
