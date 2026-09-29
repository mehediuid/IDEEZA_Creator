"use client";

// Whether the Brief may open for a project (R2-8, lib `briefOpensFor`): the
// Brief routes ask this before they mount it, so a typed address never opens
// an editable Step 1 the page's buttons don't offer. It is decided once per
// project, as soon as its stored Brief has been read, and then held: a mint
// made inside the Brief writes the project's mint record just before the
// draft's own `mintedAt` (and that draft write can be refused), and the Brief
// must not close under the maker for it.

import * as React from "react";
import { useProjectBrief } from "@/lib/brief/project-brief";
import { briefOpensFor } from "@/lib/manual/project-summary";
import type { ManualProject } from "@/lib/manual/projects";

/** Undefined until it is decided: no project yet, or its Brief not read yet. */
export function useBriefOpens(project: ManualProject | null): boolean | undefined {
  const brief = useProjectBrief(project?.id ?? "");
  const [decided, setDecided] = React.useState<{ id: string; opens: boolean } | null>(null);
  if (project && brief !== undefined && decided?.id !== project.id) {
    setDecided({ id: project.id, opens: briefOpensFor(project, brief) });
  }
  return project && decided?.id === project.id ? decided.opens : undefined;
}
