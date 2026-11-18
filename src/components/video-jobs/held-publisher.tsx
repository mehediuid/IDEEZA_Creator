"use client";

// The held publisher (owner, 2026-11-18, D6–D12): what a maker signed while videos were still being
// made (lib/market/held.ts) goes live by itself the moment every video it needs is made and chosen
// with Use this video — the Main listing onto Explore marketplace, a copy track's listing, a paused
// listing relisted, the post onto Innovations. Nothing goes live with a missing, rendering, failed
// or unreviewed video (D11). A project deleted, or sold in full meanwhile, takes its items with it.
//
// Mounted once at the app's root, inside the video jobs and the projects. One tab publishes an item
// (Web Lock `ideeza-held:<id>`); the item is re-read before each write, so a second tab finds it gone.

import * as React from "react";
import { useCreateHistory } from "@/lib/create/history";
import { onProjectDeleted } from "@/lib/manual/events";
import { buildsOf, listingMetadataOf, productsOfProject } from "@/lib/manual/project-read";
import { useManualProjects } from "@/lib/manual/projects";
import { listTrack } from "@/lib/market/editions";
import { readHeld, useHeld, writeHeld, heldWhereOf, type HeldItem } from "@/lib/market/held";
import { listingViewOf, relistListing } from "@/lib/market/listing";
import { readMarketNow, writeListings } from "@/lib/market/market-store";
import { subscribeStores, readStoredKey } from "@/lib/key-store";
import { notifyBrowser } from "@/lib/video/notify-pref";
import { readProjectVideos } from "@/lib/video/store";
import { VIDEOS_KEY } from "@/lib/video/types";
import { writeTracks } from "@/components/projects/editions/create-dialog";
import { useGuards } from "@/lib/manual/use-write-guard";
import { heldWaitOf } from "./held-wait";
import { useVideoJobs } from "./video-jobs-provider";

const NO_METADATA = { name: "", description: "", products: [], cover: null, at: 0 };

export function HeldPublisher() {
  const { hydrated, store } = useHeld();
  const { projects, setShowcase } = useManualProjects();
  const { builds } = useCreateHistory();
  const { jobs, hydrated: jobsHydrated } = useVideoJobs();
  const guards = useGuards();
  // Every held project's videos, as one string: a Use this video anywhere wakes this up.
  const ids = [...new Set(store.items.map((i) => i.projectId))];
  const videosKey = React.useSyncExternalStore(
    subscribeStores,
    () => ids.map((id) => readStoredKey(VIDEOS_KEY(id)) ?? "").join("\u0001"),
    () => "",
  );
  const busy = React.useRef(new Set<string>());

  // A deleted project's items go with it.
  React.useEffect(
    () =>
      onProjectDeleted((projectId) => {
        const s = readHeld();
        if (s.items.some((i) => i.projectId === projectId)) writeHeld({ ...s, items: s.items.filter((i) => i.projectId !== projectId) });
      }),
    [],
  );

  React.useEffect(() => {
    if (!hydrated || !jobsHydrated || store.items.length === 0) return;
    const now = Date.now();
    for (const item of store.items) {
      if (busy.current.has(item.id)) continue;
      const project = projects.find((p) => p.id === item.projectId);
      if (!project) continue; // a deleted project's items go above; one not loaded yet waits
      // Sold in full meanwhile: nothing more of it goes on sale (selling rules); its items go.
      if (guards.lockOf(project) !== null && item.kind !== "share") {
        drop(item.id);
        continue;
      }
      const products = productsOfProject(project, buildsOf(project, builds));
      if (!heldWaitOf(item, products, readProjectVideos(project.id), jobs, now).ok) continue;
      busy.current.add(item.id);
      const run = async () => {
        // Re-read: another tab may have published it already.
        if (!readHeld().items.some((i) => i.id === item.id)) return;
        const at = Date.now();
        const done = publish(item, at, {
          meta: () => listingMetadataOf(project, products, at),
          share: (story) => setShowcase(project.id, true, at, { story }),
        });
        const s = readHeld();
        writeHeld({
          ...s,
          items: s.items.filter((i) => i.id !== item.id),
          live: done ? [...s.live, { id: item.id, projectId: project.id, projectName: project.name, kind: item.kind, at }] : s.live,
        });
        if (done) notifyBrowser(`${project.name} is live`, `It's on ${heldWhereOf(item.kind)} now — every video is ready.`);
      };
      const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
      const guarded = locks?.request
        ? locks.request(`ideeza-held:${item.id}`, { ifAvailable: true }, async (lock) => {
            if (lock) await run();
          })
        : run();
      Promise.resolve(guarded)
        .catch(() => undefined)
        .finally(() => busy.current.delete(item.id));
    }
    // `videosKey` is the wake-up: a take chosen anywhere changes it.
  }, [hydrated, jobsHydrated, store, projects, builds, jobs, guards, videosKey, setShowcase]);

  return null;
}

function drop(id: string) {
  const s = readHeld();
  writeHeld({ ...s, items: s.items.filter((i) => i.id !== id) });
}

/** The write the maker signed for, done now. False when it can't be (it was listed some other way
 *  meanwhile): the item goes quietly. */
function publish(
  item: HeldItem,
  at: number,
  w: { meta: () => ReturnType<typeof listingMetadataOf>; share: (story: string) => void },
): boolean {
  switch (item.kind) {
    case "main": {
      const m = readMarketNow();
      const v = listingViewOf(item.projectId, { listings: m.listings, sales: m.sales, bids: m.bids, now: at, current: NO_METADATA });
      if (v.kind === "live" || v.kind === "paused") return false;
      const listing = { ...item.listing, listedAt: at, updatedAt: at, metadata: w.meta(), status: "live" as const, events: [{ kind: "listed" as const, at }] };
      return writeListings([...m.listings, listing]).ok;
    }
    case "relist": {
      const m = readMarketNow();
      const next = relistListing(m.listings, item.listingId, w.meta(), true, at);
      return next.ok ? writeListings(next.listings).ok : false;
    }
    case "copies":
      return writeTracks(item.projectId, (tracks) => listTrack(tracks, item.trackId, item.terms, at)).ok;
    case "share":
      w.share(item.story);
      return true;
  }
}
