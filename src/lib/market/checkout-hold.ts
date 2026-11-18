// A purchase's checkout hold, the pure half. While a buyer's purchase stands in the
// wallet's confirm, every other view of the item says someone is paying for it: the
// buyer rail in another tab greys its Buy, the owner's Earn › Sell row reads "In
// checkout". One key, a list of holds; each names its item (a Main listing's id, or a
// Physical / Virtual track's id), the tab that wrote it, and when it lapses on its own
// (10 minutes), so a tab that died mid-checkout never blocks the item for long.
// Reading drops lapsed and malformed holds; nothing is written for them.
//
// A hold is a courtesy, not a lock: the purchase's own recheck and commit still decide
// who gets the item (a second buyer reads "This listing was just sold.").
//
// Pure, no imports, so node:test loads the compiled module. The store and the hook are
// checkout-hold-store.ts.

export const CHECKOUT_HOLDS_KEY = "ideeza:market:checkout-holds";
export const CHECKOUT_HOLD_MS = 10 * 60_000;

/** Under Buy in any other view of an item that's in checkout. */
export const IN_CHECKOUT_BUYER_LINE = "Someone is buying this now. Try again in a few minutes.";
/** The owner's Main NFT row while a buyer is paying. */
export const IN_CHECKOUT_OWNER_LINE = "In checkout · a buyer is paying now";

export type CheckoutHold = { id: string; itemId: string; tab: string; expiresAt: number };

function isHold(v: unknown): v is CheckoutHold {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const h = v as Record<string, unknown>;
  return (
    typeof h.id === "string" &&
    h.id !== "" &&
    typeof h.itemId === "string" &&
    h.itemId !== "" &&
    typeof h.tab === "string" &&
    typeof h.expiresAt === "number" &&
    Number.isFinite(h.expiresAt)
  );
}

/** The holds still standing at `now`. A hold that lapses further out than one hold's life
 *  (a wrong clock, a hand-edited key) is dropped too, so nothing blocks an item for good. */
export function liveHolds(raw: unknown, now: number): CheckoutHold[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isHold).filter((h) => h.expiresAt > now && h.expiresAt <= now + CHECKOUT_HOLD_MS);
}

export function newHold(f: { id: string; itemId: string; tab: string; now: number }): CheckoutHold {
  return { id: f.id, itemId: f.itemId, tab: f.tab, expiresAt: f.now + CHECKOUT_HOLD_MS };
}

/** The list with `hold` in it (once), lapsed ones dropped. */
export function addHold(raw: unknown, hold: CheckoutHold, now: number): CheckoutHold[] {
  return [...liveHolds(raw, now).filter((h) => h.id !== hold.id), hold];
}

/** The list without hold `id`, lapsed ones dropped. Another tab's holds stay. */
export function releaseHold(raw: unknown, id: string, now: number): CheckoutHold[] {
  return liveHolds(raw, now).filter((h) => h.id !== id);
}

/** How many checkouts hold `itemId`; `exceptTab` leaves out that tab's own. */
export function heldCount(holds: readonly CheckoutHold[], itemId: string, exceptTab?: string): number {
  return holds.filter((h) => h.itemId === itemId && h.tab !== exceptTab).length;
}

/** When the next of `holds` lapses, or null with none. */
export function nextLapse(holds: readonly CheckoutHold[]): number | null {
  return holds.length ? Math.min(...holds.map((h) => h.expiresAt)) : null;
}

/** Whether Buy waits: every unit still for sale is in someone else's checkout. A Main NFT
 *  has one unit; a Physical or Virtual track has its unsold supply. */
export function checkoutBlocks(held: number, left: number): boolean {
  return left > 0 && held >= left;
}
