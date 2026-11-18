// What a held listing or share still waits for (owner, 2026-11-18, D6–D12): the same readiness rules
// that once disabled the Sell, Share and Relist buttons — every product's video chosen, then the
// project video — read here to decide "live or still waiting" instead. Shared by the publisher and
// every surface that shows the waiting state.

import type { ProjectProduct } from "@/lib/manual/project-read";
import { readinessOf, videoCountOf, videosBlockerOf, type ReadinessFacts } from "@/lib/manual/readiness";
import { heldPurposeOf, type HeldItem } from "@/lib/market/held";
import type { VideoJob } from "@/lib/video/jobs";
import type { ProjectVideos } from "@/lib/video/types";

export type HeldWait = {
  /** Every video it needs is made and chosen: it can go live. */
  ok: boolean;
  /** The first thing still missing, in the readiness dialog's words. */
  reason: string | null;
  /** Videos chosen, of the videos it needs ("2 of 4"). */
  ready: number;
  total: number;
};

/** The videos-only facts: ownership and license were settled when the maker signed. */
export function videoFactsOf(products: ProjectProduct[], videos: ProjectVideos | null, jobs: VideoJob[], now: number): ReadinessFacts {
  return { products, videos, jobs, now, status: "minted", ownershipConfirmed: true, license: null };
}

export function heldWaitOf(
  item: HeldItem,
  products: ProjectProduct[],
  videos: ProjectVideos | null,
  jobs: VideoJob[],
  now: number,
): HeldWait {
  const facts = videoFactsOf(products, videos, jobs, now);
  const purpose = heldPurposeOf(item);
  const product = item.kind === "copies" && purpose === "edition" ? products.find((p) => p.id === item.scope) : undefined;
  const r = readinessOf(purpose === "edition" ? { ...facts, product } : facts, purpose);
  const reason = videosBlockerOf(r);
  const { ready, total } = videoCountOf(r);
  return { ok: reason === null && total > 0, reason, ready, total };
}

/** The whole project's videos ("2 of 4 ready"): what a Sell or Share waits for. */
export function projectVideosWaitOf(products: ProjectProduct[], videos: ProjectVideos | null, jobs: VideoJob[], now: number): HeldWait {
  const r = readinessOf(videoFactsOf(products, videos, jobs, now), "sell");
  const reason = videosBlockerOf(r);
  const { ready, total } = videoCountOf(r);
  return { ok: reason === null && total > 0, reason, ready, total };
}
