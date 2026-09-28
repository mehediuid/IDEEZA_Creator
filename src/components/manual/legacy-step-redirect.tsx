"use client";

// LegacyStepRedirect — the old flat editor routes (/pcb, /code, /3d, /preview,
// /wiring, /brief) no longer host the editor. They bounce to the active
// project: an editor step to the product it resumes
// (/project/<slug>/products/<productId>/<step>, P2-EDITOR-2), the Brief to
// /project/<slug>/brief — or home if there is no active project. Keeps old
// bookmarks / in-flight links working without leaving a project-less editor
// reachable.

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  useManualProjects,
  type ManualFlowState,
} from "@/lib/manual/projects";
import { stepHrefFor } from "./use-step-nav";

export function LegacyStepRedirect({
  step,
}: {
  step: keyof ManualFlowState;
}) {
  const router = useRouter();
  const { hydrated, activeProject } = useManualProjects();

  React.useEffect(() => {
    if (!hydrated) return;
    // Resume, never the product a previous visit happened to hold.
    router.replace(activeProject ? stepHrefFor(activeProject, null, step) : "/");
  }, [hydrated, activeProject, step, router]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex h-dvh w-full items-center justify-center bg-bg-page text-md text-text-tertiary"
    >
      Opening project…
    </div>
  );
}
