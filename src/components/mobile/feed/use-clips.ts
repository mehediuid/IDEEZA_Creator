"use client";

// Every clip the phone can play: the Feed's samples (lib/innovations/clips.ts)
// and the projects you shared ("Share to Feed", `showcasedAt`), as the web
// lists them under "Shared by you". A project of yours is read from the stores
// its own page reads — the video in use (the project video, else a product's),
// the cover, the current Activity, the mint, the live Main listing (Buy now or
// auction, with its bids) and the listed copies — so its clip never disagrees
// with the project. Its id is `mine:<projectId>`, the id of its post, which is
// what its comments, its saves and its notices are keyed by. As the samples,
// a clip of yours plays only while it is on the marketplace (owner
// 2026-11-12: every Feed video is a marketplace item).

import * as React from "react";
import { useMinuteClock } from "@/components/projects/details/use-project-page-data";
import { useCreateHistory } from "@/lib/create/history";
import {
  FEED_CLIPS,
  licenseWordOf,
  mineClipsOf,
  onMarketplace,
  type ClipOffer,
  type FeedClip,
  type MineVideo,
} from "@/lib/innovations/clips";
import { ME } from "@/lib/innovations/people";
import { readStoredKey, subscribeStores } from "@/lib/key-store";
import { currentOf, JOURNEY_KEY, labelOf } from "@/lib/manual/journey";
import { decodeJourney } from "@/lib/manual/journey-store";
import { buildsOf, coverOf, productsOfProject } from "@/lib/manual/project-read";
import { useManualProjects } from "@/lib/manual/projects";
import { auctionStateOf } from "@/lib/market/auction";
import { isProjectScope, liveTracksOf, soldOf } from "@/lib/market/editions";
import { useProjectsEditions } from "@/lib/market/editions-store";
import { useMarket } from "@/lib/market/market-store";
import type { EditionTrack, MarketData } from "@/lib/market/types";
import { useMe } from "@/lib/people/profile-store";
import { decodeProjectVideos } from "@/lib/video/store";
import { PROJECT_VIDEO_KEY, VIDEOS_KEY } from "@/lib/video/types";
import { formatAmount } from "@/lib/wallet/money";

/** The stored values of one key per project, live (null until the browser is read). */
function useRawPerProject(ids: readonly string[], keyOf: (id: string) => string): (string | null)[] | null {
  const snapshot = React.useSyncExternalStore(
    subscribeStores,
    () => JSON.stringify(ids.map((id) => readStoredKey(keyOf(id)))),
    () => "",
  );
  return React.useMemo(() => (snapshot ? (JSON.parse(snapshot) as (string | null)[]) : null), [snapshot]);
}

/** The live Main listing of a project as the clip's first offer; null when it has none on sale. */
function mainOfferOf(projectId: string, market: MarketData, now: number): ClipOffer | null {
  const main = market.listings
    .filter((l) => l.projectId === projectId && l.slot === "main")
    .reduce<MarketData["listings"][number] | null>((a, b) => (a && a.listedAt > b.listedAt ? a : b), null);
  if (!main || main.status !== "live") return null;
  if (market.sales.some((s) => s.listingId === main.id && s.item.nft === "main")) return null;
  if (main.type === "auction") {
    const state = auctionStateOf(main, market.bids, now);
    if (state.phase === "ended") return null;
    const bid = formatAmount(state.top?.amount ?? main.minBid ?? "0", main.token);
    return {
      kind: "main",
      price: bid,
      use: null,
      sold: null,
      sharePct: main.percentSelling,
      auction: { bidLabel: state.top ? "Current bid" : "Starting bid", bid, next: formatAmount(state.minNext, main.token), endsAt: main.endsAt ?? null },
    };
  }
  return { kind: "main", price: formatAmount(main.price ?? "0", main.token), use: null, sold: null, sharePct: main.percentSelling };
}

function copyOfferOf(t: EditionTrack, market: MarketData): ClipOffer | null {
  if (!t.listing) return null;
  return {
    kind: t.kind,
    price: formatAmount(t.listing.regular, t.listing.token),
    use: licenseWordOf(t.use === "commercial" ? "commercial" : "personal"),
    sold: { count: soldOf(t.id, market.sales), of: t.supply.total },
  };
}

/** The projects you shared, as clips, newest first. */
export function useMineClips(): { hydrated: boolean; clips: FeedClip[] } {
  const { hydrated: projectsReady, projects } = useManualProjects();
  const { hydrated: buildsReady, builds } = useCreateHistory();
  const { hydrated: marketReady, data: market } = useMarket();
  const me = useMe();
  const now = useMinuteClock();

  const shared = React.useMemo(
    () => projects.filter((p) => typeof p.showcasedAt === "number").sort((a, b) => (b.showcasedAt ?? 0) - (a.showcasedAt ?? 0)),
    [projects],
  );
  const ids = React.useMemo(() => shared.map((p) => p.id), [shared]);
  const editions = useProjectsEditions(ids);
  const journeys = useRawPerProject(ids, JOURNEY_KEY);
  const videos = useRawPerProject(ids, VIDEOS_KEY);
  const hydrated = projectsReady && buildsReady && marketReady && editions.hydrated && journeys !== null && videos !== null && now > 0;

  const clips = React.useMemo(() => {
    if (!hydrated || !journeys || !videos) return [];
    const creator = { ...ME, name: me.name, initials: me.initials };
    return shared.flatMap((p, i) => {
      const refs = buildsOf(p, builds);
      const products = productsOfProject(p, refs).filter((x) => x.dropped === null);
      const record = decodeProjectVideos(videos[i] ?? null, p.id);
      const takeOf = (key: string) => {
        const pv = record?.products[key];
        return pv?.inUseId && pv.takes.some((t) => t.id === pv.inUseId) ? pv.inUseId : null;
      };
      const title = p.name.trim() || "Untitled project";
      const list: MineVideo[] = [];
      const own = takeOf(PROJECT_VIDEO_KEY);
      if (own) list.push({ productId: null, name: title, summary: "", takeId: own, poster: null });
      for (const x of products) {
        const take = takeOf(x.id);
        if (!take) continue;
        list.push({
          productId: x.id,
          name: x.name.trim() || "Untitled product",
          summary: x.description.trim() || x.built?.product.description?.trim() || "",
          takeId: take,
          poster: x.built?.product.conceptImageUrl || null,
        });
      }
      const current = currentOf(decodeJourney(journeys[i] ?? null), p.id, { kind: "project" }, p.createdAt);
      const tracks = liveTracksOf(
        editions.record.filter((t) => t.projectId === p.id),
        market.sales,
        false,
      );
      const main = mainOfferOf(p.id, market, now);
      const copies = tracks.map((t) => copyOfferOf(t, market)).filter((o): o is ClipOffer => o !== null);
      const productOffers: Record<string, ClipOffer[]> = {};
      for (const t of tracks) {
        if (isProjectScope(t.productId)) continue;
        const o = copyOfferOf(t, market);
        if (o) (productOffers[t.productId] ??= []).push(o);
      }
      return mineClipsOf({
        projectId: p.id,
        title,
        description: p.post?.story.trim() || p.description.trim(),
        creator,
        sharedAt: p.showcasedAt as number,
        cover: coverOf(p, refs),
        // Others has no place on the stage line (the web's post shows none).
        stage: current && current.type !== "others" ? labelOf(current) : null,
        minted: !!p.mint,
        videos: list,
        offers: [...(main ? [main] : []), ...copies],
        productOffers,
      }).filter(onMarketplace);
    });
  }, [hydrated, journeys, videos, shared, builds, editions.record, market, me.name, me.initials, now]);

  return { hydrated, clips };
}

/** The samples and your own, and one of them by its id (`p1`, `p1~remote`, `mine:<projectId>`). */
export function useFeedClips(): { hydrated: boolean; mine: FeedClip[]; all: FeedClip[]; byId: (id: string) => FeedClip | null } {
  const { hydrated, clips: mine } = useMineClips();
  return React.useMemo(() => {
    const all = [...mine, ...FEED_CLIPS];
    return { hydrated, mine, all, byId: (id: string) => all.find((c) => c.id === id) ?? null };
  }, [hydrated, mine]);
}
