"use client";

// useProjectPageData — every store read a project page needs, then the one
// derivation (Phase 2 spec §3.6.2, §3.7). `/projects/[id]` and its product
// pages read it with the "project" context; Explore marketplace's buyer view
// (`/marketplace/[id]`, T23) with "market".
//
// - It resolves the address to a project, by id and then by slug (COR-1).
// - It decides who is looking: on the project page, `?view=buyer` and
//   `?view=contributor&as=<id>` (P2-CONTRIB-12); on the marketplace, the
//   active demo buyer (P2-MARKETPLACE-8). Either way `can()` gets the answer.
// - It keeps the page on its skeleton until EVERY store has been read —
//   projects, builds, video jobs, the Brief draft, the market, the product
//   videos, the journey, the editions, the business plan and the network —
//   so no state flashes a Draft or an empty tab it isn't (COR-2).
// - It hands the real market, video, journey, editions, plan and viewer facts
//   to `projectView`, which folds them into `projectSummary` too, so no slot
//   derives a fact of its own (COR-74).
//
// Every store is a live `useSyncExternalStore` read, so a listing written in
// another tab moves the chip without a reload.

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";
import { useProjectBrief, type StoredDraft } from "@/lib/brief/project-brief";
import { useCreateHistory } from "@/lib/create/history";
import { AS_PARAM, VIEW_PARAM, viewerFromParams } from "@/lib/manual/buyer-preview";
import { useBusinessPlan } from "@/lib/manual/business-plan-store";
import { useJourney } from "@/lib/manual/journey-store";
import type { Contributor } from "@/lib/manual/p2-types";
import type { Viewer } from "@/lib/manual/permissions";
import { projectView, type ProjectView } from "@/lib/manual/project-read";
import { resolveProject } from "@/lib/manual/project-route";
import { useManualProjects, type ManualProject } from "@/lib/manual/projects";
import { useEditions } from "@/lib/market/editions-store";
import { useMarket } from "@/lib/market/market-store";
import { useProjectNetwork } from "@/lib/network/store";
import { useProjectVideos } from "@/lib/video/store";
import { useActiveBuyer } from "@/lib/wallet/use-demo-wallet";

/** Which page reads it: the maker's project page, or Explore marketplace's buyer view. */
export type ProjectPageContext = "project" | "market";

export type ProjectPageData =
  /** A store hasn't been read yet: show the skeleton (COR-2). */
  | { state: "loading" }
  /** Nothing at this address. In the "market" context that includes a project that has
   *  never had a listing, so a private project never leaks through a typed URL (P2-MARKETPLACE-8). */
  | { state: "missing" }
  | {
      state: "ready";
      project: ManualProject;
      view: ProjectView;
      viewer: Viewer;
      brief: StoredDraft | null;
      /** The minute clock `view` was derived at. */
      now: number;
      /** `projectTabsFor`'s fact: the network store is read and this project has one (COR-49). */
      networkReadable: boolean;
    };

const MINUTE = 60_000;
const NO_CONTRIBUTORS: readonly Contributor[] = [];

/** The wall clock to the minute, read through useSyncExternalStore (the
 *  pattern of step-3-mint.tsx): an auction end or a clip ETA that passes while
 *  the page is open moves on its own, and render stays pure. */
export function useMinuteClock(): number {
  const subscribe = React.useCallback((onChange: () => void) => {
    const timer = window.setInterval(onChange, MINUTE);
    return () => window.clearInterval(timer);
  }, []);
  return React.useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / MINUTE) * MINUTE,
    () => 0,
  );
}

export function useProjectPageData(id: string, context: ProjectPageContext): ProjectPageData {
  const search = useSearchParams();
  const { hydrated, projects } = useManualProjects();
  const { hydrated: historyHydrated, builds, chats } = useCreateHistory();
  const { hydrated: jobsHydrated, jobs: videoJobs } = useVideoJobs();
  const market = useMarket();
  const project = resolveProject(projects, id);
  const pid = project?.id ?? "";
  const brief = useProjectBrief(pid);
  const videos = useProjectVideos(pid);
  const journey = useJourney(pid);
  const editions = useEditions(pid);
  const plan = useBusinessPlan(pid);
  const network = useProjectNetwork(pid);
  const { buyer } = useActiveBuyer();
  const now = useMinuteClock();

  const contributors = project?.contributors ?? NO_CONTRIBUTORS;
  const viewParam = search.get(VIEW_PARAM);
  const asParam = search.get(AS_PARAM);
  const viewer = React.useMemo<Viewer>(
    () =>
      context === "market"
        ? { kind: "demo-buyer", buyerId: buyer.id }
        : viewerFromParams(viewParam, asParam, contributors),
    [context, buyer.id, viewParam, asParam, contributors],
  );

  const view = React.useMemo(
    () =>
      project && brief !== undefined
        ? projectView(project, {
            builds,
            chats,
            brief,
            videoJobs,
            now,
            projects,
            market: market.data,
            videos: videos.record,
            journey: journey.record,
            editions: editions.record,
            plan: plan.record,
            viewer,
          })
        : null,
    [
      project,
      brief,
      builds,
      chats,
      videoJobs,
      now,
      projects,
      market.data,
      videos.record,
      journey.record,
      editions.record,
      plan.record,
      viewer,
    ],
  );

  const read =
    hydrated &&
    historyHydrated &&
    jobsHydrated &&
    market.hydrated &&
    videos.hydrated &&
    journey.hydrated &&
    editions.hydrated &&
    plan.hydrated &&
    network.hydrated;
  if (!read) return { state: "loading" };
  if (!project) return { state: "missing" };
  if (context === "market" && !market.data.listings.some((l) => l.projectId === project.id)) {
    return { state: "missing" };
  }
  // The Brief draft is read one render after the stores. Until then the page
  // keeps its skeleton rather than flash a Draft it may not be.
  if (!view || brief === undefined) return { state: "loading" };
  return {
    state: "ready",
    project,
    view,
    viewer,
    brief,
    now,
    networkReadable: network.network !== null,
  };
}
