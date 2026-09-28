"use client";

// ProjectPage is /projects/[id] (spec §5.3).
// - It reads the four stores the page derives from: projects, history, video
//   jobs and the project's Brief draft.
// - It resolves the address to a project, by id and then by slug.
// - It shows one of three states: the skeleton until every read is in
//   (COR-2), not found (COR-1), or the shell with SLOTS.
// - `?tab=` and `?view=buyer` are URL state, so a reload and Back keep them
//   (COR-7, PPL-5).
//
// SLOTS is the one place the page is composed. Each later page task swaps its
// entry for the real section (see task-C1.md, "Hand-off"). A section written
// with its own props mounts through a one-line adapter component here.

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";
import { useProjectBrief } from "@/lib/brief/project-brief";
import { useCreateHistory } from "@/lib/create/history";
import { can } from "@/lib/manual/permissions";
import { projectView } from "@/lib/manual/project-read";
import {
  parseProjectTab,
  resolveProject,
  type ProjectTabId,
} from "@/lib/manual/project-route";
import { useManualProjects } from "@/lib/manual/projects";
import { BUYER_VIEW, VIEW_PARAM } from "@/lib/manual/buyer-preview";
import { BuyerPreviewBanner, isBuyerPreview, useViewer } from "./buyer-preview";
import { ProjectHeader } from "./header";
import { MediaTab } from "./media-tab";
import { NetworkTab, useNetworkTabVisible } from "./network-tab";
import { ProjectNotFound, ProjectSkeleton } from "./page-states";
import { ProductsTab } from "./products-tab";
import { RailDetails } from "./rail-details";
import { RailLog } from "./rail-log";
import { RailManage } from "./rail-manage";
import { RailOutcome } from "./rail-outcome";
import { RailVersions } from "./rail-versions";
import { ProjectShell } from "./shell";
import { SavedBanner } from "./saved-banner";
import { DescriptionCoachmark } from "./description-coachmark";
import type { HeaderSlotProps, ProjectSlots, SlotProps } from "./slots";

// C5's wiring (task-C1.md's Hand-off). The page renders only after every
// store is read, so the tab has no loading state of its own.
function MediaSlot({ project, view, brief, viewer }: SlotProps) {
  return <MediaTab project={project} refs={view.refs} draft={brief} viewer={viewer} />;
}

// C2's wiring: the header's own data props are `{ project, view, viewer }`
// (task-C2.md); this adapter is what satisfies HeaderSlotProps, threading
// the shell's arrival-focus ref and its one live region announcer down to
// ProjectHeader (which forwards `titleRef` on to ProjectTitle).
function HeaderSlot({ project, view, viewer, titleRef, announce }: HeaderSlotProps) {
  return <ProjectHeader project={project} view={view} viewer={viewer} titleRef={titleRef} announce={announce} />;
}

// C3's wiring (task-C1.md hand-off): ProductsTab takes its own props, not
// SlotProps, so it mounts through this one-line adapter. In Preview as buyer
// every card keeps `?view=buyer`, so the product page opens as the buyer
// sees it too (COR-37).
const BUYER_QUERY = `?${VIEW_PARAM}=${BUYER_VIEW}`;
function ProductsSlot({ project, view, viewer, now }: SlotProps) {
  const { chats } = useCreateHistory();
  return (
    <ProductsTab
      projectId={project.id}
      products={view.products}
      chats={chats}
      showOwnerOnlyFacts={can(viewer, "facts.seeOwnerOnly")}
      now={now}
      linkQuery={isBuyerPreview(viewer) ? BUYER_QUERY : ""}
    />
  );
}

// C7's two rail blocks take their own props; they mount through these, as the
// slot contract asks. The other four rail blocks are SlotProps components.
// Showcase speaks through the shell's one live region (COR-101).
function OutcomeSlot({ view, viewer, announce }: SlotProps) {
  return <RailOutcome summary={view.summary} commerce={view.commerce} viewer={viewer} announce={announce} />;
}
function DetailsSlot({ project, view, viewer }: SlotProps) {
  return <RailDetails project={project} summary={view.summary} viewer={viewer} />;
}

// C6's wiring (task-C1.md hand-off). Every build the project holds, so each
// product's parts come from the build that product is in (COR-48).
function NetworkSlot({ project, view, viewer }: SlotProps) {
  return <NetworkTab project={project} refs={view.refs} viewer={viewer} />;
}
function PreviewBannerSlot({ viewer }: SlotProps) {
  return isBuyerPreview(viewer) ? <BuyerPreviewBanner /> : null;
}

const SLOTS: ProjectSlots = {
  banner: PreviewBannerSlot,
  notice: SavedBanner,
  header: HeaderSlot,
  headerParts: { afterDescription: [DescriptionCoachmark] },
  tabs: {
    products: ProductsSlot,
    media: MediaSlot,
    network: NetworkSlot,
  },
  rail: {
    outcome: OutcomeSlot,
    details: DetailsSlot,
    versions: RailVersions,
    log: RailLog,
    manage: RailManage,
  },
};

const NO_HIDDEN_TABS: readonly ProjectTabId[] = [];
const NETWORK_HIDDEN: readonly ProjectTabId[] = ["network"];

export function ProjectPage({ id }: { id: string }) {
  // useSearchParams needs a boundary so the route can still be pre-rendered.
  // Its fallback is the same skeleton, so nothing changes shape at hydration.
  return (
    <React.Suspense fallback={<ProjectSkeleton />}>
      <ProjectPageInner id={id} />
    </React.Suspense>
  );
}

const MINUTE = 60_000;

/** The wall clock to the minute, read through useSyncExternalStore (the
 *  pattern of step-3-mint.tsx): an auction end or a clip ETA that passes while
 *  the page is open moves on its own, and render stays pure. */
function useMinuteClock(): number {
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

function ProjectPageInner({ id }: { id: string }) {
  const search = useSearchParams();
  const { hydrated, projects } = useManualProjects();
  const { hydrated: historyHydrated, builds, chats } = useCreateHistory();
  const { hydrated: videoHydrated, jobs: videoJobs } = useVideoJobs();
  const project = resolveProject(projects, id);
  const brief = useProjectBrief(project?.id ?? "");
  const now = useMinuteClock();

  const viewer = useViewer();
  // COR-49: no Network tab in preview until there's a network to read. The
  // skeleton waits for the network store too, so `?tab=network&view=buyer`
  // opens on Network rather than on Products for a frame.
  const network = useNetworkTabVisible(project?.id ?? "", viewer);

  const view = React.useMemo(
    () =>
      project && brief !== undefined
        ? projectView(project, { builds, chats, brief, videoJobs, now, projects })
        : null,
    [project, brief, builds, chats, videoJobs, now, projects],
  );

  if (!hydrated || !historyHydrated || !videoHydrated || !network.hydrated) return <ProjectSkeleton />;
  if (!project) return <ProjectNotFound id={id} />;
  // The Brief draft is read one render after the stores. Until then the page
  // keeps its skeleton rather than flash a Draft it may not be.
  if (!view || brief === undefined) return <ProjectSkeleton />;

  return (
    <ProjectShell
      project={project}
      view={view}
      viewer={viewer}
      brief={brief}
      now={now}
      asked={parseProjectTab(search.get("tab"))}
      hiddenTabs={network.shown ? NO_HIDDEN_TABS : NETWORK_HIDDEN}
      slots={SLOTS}
    />
  );
}
