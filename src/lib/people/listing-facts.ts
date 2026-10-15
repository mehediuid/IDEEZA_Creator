// What a profile needs from the market about one of your projects: is its
// Main listing live, are any copies on sale, and since when (spec
// 2026-10-14-creator-profile-design.md). A paused, removed, ended or sold
// listing is not on sale; a sold-out copy track is not either. Pure, relative
// imports only.

import { liveTracksOf } from "../market/editions";
import type { EditionTrack, Listing, Sale } from "../market/types";

export type ListingFacts = { mainLive: boolean; copiesLive: boolean; listedAt: number | null };

export function listingFactsOf(
  projectId: string,
  listings: readonly Listing[],
  sales: readonly Sale[],
  tracks: readonly EditionTrack[],
): ListingFacts {
  const main = listings
    .filter((l) => l.projectId === projectId && l.slot === "main")
    .reduce<Listing | null>((a, b) => (a && a.listedAt > b.listedAt ? a : b), null);
  const mainSold = !!main && sales.some((s) => s.listingId === main.id && s.item.nft === "main");
  const mainLive = !!main && main.status === "live" && !mainSold;
  const live = liveTracksOf(tracks.filter((t) => t.projectId === projectId), [...sales], false);
  const copiesLive = live.length > 0;
  const trackAt = live.reduce<number | null>((at, t) => Math.max(at ?? 0, t.listing?.listedAt ?? 0), null);
  return { mainLive, copiesLive, listedAt: mainLive && main ? main.listedAt : copiesLive ? trackAt : null };
}
