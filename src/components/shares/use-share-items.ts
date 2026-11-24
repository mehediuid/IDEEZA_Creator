"use client";

// Every item a share can point at (lib/innovations/share-items.ts), for the web and the phone alike:
// the sample creators' marketplace items, read from their posts, and your own projects and products,
// read from the stores their pages read (the name, the products, the cover, the current Activity, and
// whether anything of it is live on the Marketplace). `itemOf` finds an item by its id, shared or
// about to be; `publicOf` says whether it can be shared: anything on Innovations or on the
// Marketplace, anyone's, yours too (owner 2026-11-22: "what is on Innovations I can re-share without
// any problem; who said my own project or product can't be shared?") — never a private project;
// `liveOf` says whether it is on the Marketplace now (then a share plays on the phone Feed too).
// The shares themselves are the phone's Feed prefs (`shares`, one store for web and phone): `useShares`
// adds one and removes one.

import * as React from "react";
import { useCreateHistory } from "@/lib/create/history";
import { withShare, withoutShare, type FeedShare, type ShareAudience } from "@/lib/innovations/feed-prefs";
import { ME } from "@/lib/innovations/people";
import { mineShareItem, parseShareItemId, sampleOnMarketplace, sampleShareItem, type ShareItem } from "@/lib/innovations/share-items";
import { currentOf, labelOf } from "@/lib/manual/journey";
import { readJourney } from "@/lib/manual/journey-store";
import { buildsOf, coverOf, productsOfProject } from "@/lib/manual/project-read";
import { useManualProjects } from "@/lib/manual/projects";
import { useProjectsEditions } from "@/lib/market/editions-store";
import { useMarket } from "@/lib/market/market-store";
import { listingFactsOf } from "@/lib/people/listing-facts";
import { useMe } from "@/lib/people/profile-store";
import { newId, useFeedPrefs } from "@/components/mobile/feed/use-feed";

export function useShareItems(): {
  hydrated: boolean;
  itemOf: (id: string) => ShareItem | null;
  liveOf: (id: string) => boolean;
  publicOf: (id: string) => boolean;
} {
  const { hydrated: projectsReady, projects } = useManualProjects();
  const { hydrated: buildsReady, builds } = useCreateHistory();
  const { hydrated: marketReady, data: market } = useMarket();
  const ids = React.useMemo(() => projects.map((p) => p.id), [projects]);
  const editions = useProjectsEditions(ids);
  const me = useMe();
  const hydrated = projectsReady && buildsReady && marketReady && editions.hydrated;

  return React.useMemo(() => {
    const creator = { ...ME, name: me.name, initials: me.initials };
    const mine = (projectId: string) => projects.find((p) => p.id === projectId) ?? null;
    const itemOf = (id: string): ShareItem | null => {
      const at = parseShareItemId(id);
      if (!at) return null;
      if (at.source === "sample") return sampleShareItem(id);
      if (!hydrated) return null;
      const p = mine(at.projectId);
      if (!p) return null;
      const refs = buildsOf(p, builds);
      const current = currentOf(readJourney(p.id), p.id, { kind: "project" }, p.createdAt);
      return mineShareItem(id, {
        projectId: p.id,
        name: p.name,
        products: productsOfProject(p, refs)
          .filter((x) => x.dropped === null)
          .map((x) => ({ id: x.id, name: x.name, image: x.built?.product.conceptImageUrl || null })),
        cover: coverOf(p, refs),
        // Others has no place on a stage line (the Feed and the web post show none).
        stage: current && current.type !== "others" ? labelOf(current) : null,
        creator,
      });
    };
    const liveOf = (id: string): boolean => {
      const at = parseShareItemId(id);
      if (!at) return false;
      if (at.source === "sample") return sampleOnMarketplace(id);
      if (!hydrated || !mine(at.projectId)) return false;
      const facts = listingFactsOf(at.projectId, market.listings, market.sales, editions.record);
      return facts.mainLive || facts.copiesLive;
    };
    const publicOf = (id: string): boolean => {
      const at = parseShareItemId(id);
      if (!at) return false;
      // Every sample post is on Innovations.
      if (at.source === "sample") return sampleShareItem(id) !== null;
      const p = mine(at.projectId);
      if (!p || !itemOf(id)) return false;
      return typeof p.showcasedAt === "number" || liveOf(id);
    };
    return { hydrated, itemOf, liveOf, publicOf };
  }, [hydrated, projects, builds, market, editions.record, me.name, me.initials]);
}

/** The shares, newest first, and the two writes: share an item with your words, take a share off. */
export function useShares(): {
  hydrated: boolean;
  shares: FeedShare[];
  share: (itemId: string, caption: string, audience: ShareAudience) => boolean;
  remove: (shareId: string) => boolean;
  restore: (share: FeedShare) => boolean;
} {
  const { hydrated, prefs, update } = useFeedPrefs();
  return React.useMemo(
    () => ({
      hydrated,
      shares: prefs.shares.slice().sort((a, b) => b.at - a.at),
      share: (itemId, caption, audience) => update((p) => withShare(p, { id: newId("share"), clipId: itemId, caption, audience, at: Date.now() })),
      remove: (shareId) => update((p) => withoutShare(p, shareId)),
      restore: (share) => update((p) => (p.shares.some((s) => s.id === share.id) ? p : { ...p, shares: [...p.shares, share] })),
    }),
    [hydrated, prefs.shares, update],
  );
}
