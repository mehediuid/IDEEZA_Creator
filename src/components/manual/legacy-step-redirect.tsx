"use client";

// LegacyStepRedirect — the old flat editor routes (/pcb, /code, /3d, /preview,
// /brief) no longer host the editor. They bounce to the project-scoped URL of
// the active project (/project/<slug>/<step>), or home if there is no active
// project. Keeps old bookmarks / in-flight links working without leaving a
// project-less editor reachable.

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  stepHref,
  useManualProjects,
  type ManualFlowState,
} from "@/lib/manual/projects";

export function LegacyStepRedirect({
  step,
}: {
  step: keyof ManualFlowState;
}) {
  const router = useRouter();
  const { hydrated, activeProject } = useManualProjects();

  React.useEffect(() => {
    if (!hydrated) return;
    router.replace(activeProject ? stepHref(activeProject, step) : "/");
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
