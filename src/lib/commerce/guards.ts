// Commerce's guards (Build and Earn P1-1): its answers to engineering's write
// and delete gates (manual/guards.ts). components/commerce/commerce-root.tsx
// registers them at the app root. The rules are today's, unchanged:
// - sold in full (decision 12): `projectLockOf` → locked, with the lock's line;
// - the listing (P2-LISTING-13): a live Buy now asks to pause first and an
//   auction blocks (`listingEditGate`). The pause is this guard's confirm
//   step; its undo puts back what it paused, for a write that is then refused;
// - delete (§3.8.4): `deleteBlockOf` over commerce's facts — a buyer or a
//   co-owner holds a share, the project is listed or in an auction, or the
//   market can't be read.
//
// Pure over a `CommerceSource`, so node:test runs each guard on plain data.

import type { ComponentType } from "react";
import { listingViewOf, pauseForEdit } from "../market/listing";
import type { EditionTrack, Listing, ListingMetadata, MarketData } from "../market/types";
import {
  deleteBlockOf,
  deleteFactsOf,
  NO_UNDO,
  ownershipOf,
  registerDeleteGuard,
  registerWriteGuard,
  type DeleteGuard,
  type GuardConfirmProps,
  type GuardProject,
  type LockedVerdict,
  type WriteChange,
  type WriteGuard,
  type WriteVerdict,
} from "../manual/public";
import { WRITE_ERROR_MESSAGE } from "../storage-status";
import { listingEditGate, projectLockOf } from "./edit-gate";

/** Where the guards read and write: the market store and the editions store in the browser. */
export type CommerceSource = {
  /** The four market keys as they are now (`readMarketNow`). */
  market: () => MarketData;
  /** Replaces the stored listings (`writeListings`). */
  writeListings: (next: Listing[]) => { ok: boolean };
  /** A project's edition tracks (`readEditions`). */
  editions: (projectId: string) => EditionTrack[];
  /** Fires when any store key changes (`subscribeStores`). */
  subscribe: (onChange: () => void) => () => void;
};

const FREE: WriteVerdict = { kind: "free" };

// The gate reads the listing's kind and the auction's phase only; the
// paused-diff `listingViewOf` also derives isn't used here.
const NO_METADATA: ListingMetadata = { name: "", description: "", products: [], cover: null, at: 0 };

function listingOf(projectId: string, market: MarketData, now: number) {
  return listingViewOf(projectId, {
    listings: market.listings,
    sales: market.sales,
    bids: market.bids,
    now,
    current: NO_METADATA,
  });
}

/** The 100 % sale's lock (decision 12): a project the maker holds none of is read-only for good. */
export function soldInFullGuard(src: CommerceSource): WriteGuard {
  const lock = (p: GuardProject): LockedVerdict | null => {
    const held = projectLockOf(p, src.market().sales);
    return held ? { kind: "locked", reason: held.line } : null;
  };
  return {
    id: "commerce.soldInFull",
    check: (p) => lock(p) ?? FREE,
    lockOf: lock,
    subscribe: src.subscribe,
    snapshot: src.market,
    unreadable: () => src.market().unreadable,
  };
}

/** Puts back each of `before` that reads paused now — the pause `confirm` wrote for a write
 *  that was then refused. False when that write is refused too. */
function unpauseOf(before: readonly Listing[], src: CommerceSource): boolean {
  if (!before.length) return true;
  const was = new Map(before.map((l) => [l.id, l]));
  const now = src.market().listings;
  if (!now.some((l) => was.has(l.id) && l.status === "paused")) return true;
  return src.writeListings(now.map((l) => (l.status === "paused" ? (was.get(l.id) ?? l) : l))).ok;
}

/** The Main listing's gate (P2-LISTING-13): pause a live Buy now first, wait out an auction.
 *  `Confirm` is the pause dialog. */
export function listingGuard(src: CommerceSource, Confirm?: ComponentType<GuardConfirmProps>): WriteGuard {
  const verdict = (p: GuardProject, change: WriteChange, now: number, market = src.market()) =>
    listingEditGate(listingOf(p.id, market, now), change);
  return {
    id: "commerce.listing",
    check: (p, change, now) => verdict(p, change, now),
    confirm: (p, change, now) => {
      const market = src.market();
      const v = verdict(p, change, now, market);
      if (v.kind !== "confirm") return { ok: true, undo: NO_UNDO };
      const before = market.listings.filter((l) => l.projectId === p.id && l.status === "live");
      const paused = pauseForEdit(market.listings, v.listingId, change, now);
      if (!paused.ok) return { ok: false, reason: paused.reason };
      if (!src.writeListings(paused.listings).ok) return { ok: false, reason: WRITE_ERROR_MESSAGE };
      return { ok: true, undo: () => unpauseOf(before, src) };
    },
    ...(Confirm ? { Confirm } : null),
    subscribe: src.subscribe,
    snapshot: src.market,
    unreadable: () => src.market().unreadable,
  };
}

/** The delete gate (§3.8.4) over commerce's facts — the spec's "holds a share" guard, which
 *  answers the whole table, since every one of its facts is commerce's. */
export function commerceDeleteGuard(src: CommerceSource): DeleteGuard {
  return {
    id: "commerce.delete",
    check: (p, now) => {
      const market = src.market();
      const sales = market.sales.filter((s) => s.projectId === p.id);
      const listing = listingOf(p.id, market, now);
      const ownership = ownershipOf({
        createdAt: p.createdAt,
        contributors: p.contributors ?? [],
        sales,
        // A paused listing still holds its share (projectSummary's R1-1).
        listedPercent: listing.kind === "live" || listing.kind === "paused" ? listing.listing.percentSelling : 0,
      });
      return deleteBlockOf(
        deleteFactsOf({ listing, sales, ownership, marketUnreadable: market.unreadable, editions: src.editions(p.id) }),
      );
    },
  };
}

/** Registers the three guards — the lock before the listing gate — and returns the unregister. */
export function registerCommerceGuards(src: CommerceSource, Confirm?: ComponentType<GuardConfirmProps>): () => void {
  const off = [
    registerWriteGuard(soldInFullGuard(src)),
    registerWriteGuard(listingGuard(src, Confirm)),
    registerDeleteGuard(commerceDeleteGuard(src)),
  ];
  return () => {
    for (const o of off) o();
  };
}
