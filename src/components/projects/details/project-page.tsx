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
import type { Viewer } from "@/lib/manual/permissions";
import { projectView } from "@/lib/manual/project-read";
import {
  parseProjectTab,
  resolveProject,
  type ProjectTabId,
} from "@/lib/manual/project-route";
import { useManualProjects } from "@/lib/manual/projects";
import {
  LegacyDetailsBlock,
  LegacyEditorBlock,
  LegacyHeader,
  LegacyNetwork,
  LegacyProducts,
} from "./legacy";
import { ProjectNotFound, ProjectSkeleton } from "./page-states";
import { ProjectShell } from "./shell";
import type { ProjectSlots } from "./slots";

const SLOTS: ProjectSlots = {
  header: LegacyHeader,
  tabs: {
    products: LegacyProducts,
    network: LegacyNetwork,
  },
  rail: {
    editor: LegacyEditorBlock,
    details: LegacyDetailsBlock,
  },
};

const NO_HIDDEN_TABS: readonly ProjectTabId[] = [];

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

  // Preview as buyer's own hook (C6's useViewer) replaces these two lines.
  const buyer = search.get("view") === "buyer";
  const viewer = React.useMemo<Viewer>(
    () => (buyer ? { kind: "owner-preview" } : { kind: "local-owner" }),
    [buyer],
  );

  const view = React.useMemo(
    () =>
      project && brief !== undefined
        ? projectView(project, { builds, chats, brief, videoJobs, now })
        : null,
    [project, brief, builds, chats, videoJobs, now],
  );

  if (!hydrated || !historyHydrated || !videoHydrated) return <ProjectSkeleton />;
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
      hiddenTabs={NO_HIDDEN_TABS}
      slots={SLOTS}
    />
  );
}
