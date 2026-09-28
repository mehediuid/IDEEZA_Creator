"use client";

// Interim sections: today's project page (project-details.tsx before Task C1),
// moved here when the page became a shell with slots, so the page keeps
// showing all it did while the real slots land. Each fills one slot in
// project-page.tsx until its task replaces it, and that task deletes it here:
//   LegacyNetwork  → the Network tab task (§5.9, C6)
// The task that removes the last export deletes this file.
// (The Products tab task, the rail task and the header task removed their
// fillers here — see ./products-tab.tsx, ./rail-*.tsx and ./header.tsx.)
//
// Changed from the old page, forced by the data layer: "the" build is the
// newest one the project holds; the old page read `project.buildId` alone
// (COR-86).

import { NetworkSection } from "@/components/network/network-section";
import type { BuildJob } from "@/lib/create/history";
import type { ProjectView } from "@/lib/manual/project-read";
import type { SlotProps } from "./slots";

/** The newest build this project holds that is still in this browser. */
function legacyBuild(view: ProjectView): BuildJob | null {
  let newest: BuildJob | null = null;
  for (const ref of view.refs) {
    if (ref.job && (!newest || ref.job.createdAt > newest.createdAt)) newest = ref.job;
  }
  return newest;
}

export function LegacyNetwork({ project, view }: SlotProps) {
  return <NetworkSection project={project} build={legacyBuild(view)} />;
}
