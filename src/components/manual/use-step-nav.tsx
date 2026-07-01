"use client";

// useStepNav — one place to navigate between editor steps. Resolves the active
// project to its scoped URL (/project/<slug>/<step>) so no call-site hardcodes
// a flat "/pcb" link. If there is no active project the links fall back home.

import { useRouter } from "next/navigation";
import {
  stepHref,
  useManualProjects,
  type ManualFlowState,
} from "@/lib/manual/projects";

// Left-rail item key → flow step. The 3D rail item keys as "3d" while its flow
// step is "three". Shared by every editor rail so they navigate identically.
export const RAIL_KEY_TO_STEP: Partial<
  Record<string, keyof ManualFlowState>
> = {
  pcb: "pcb",
  code: "code",
  "3d": "three",
  preview: "preview",
  brief: "brief",
};

export function useStepNav() {
  const router = useRouter();
  const { activeProject } = useManualProjects();

  const go = (step: keyof ManualFlowState) => {
    router.push(activeProject ? stepHref(activeProject, step) : "/");
  };
  const hrefFor = (step: keyof ManualFlowState) =>
    activeProject ? stepHref(activeProject, step) : "/";

  return { go, hrefFor, activeProject };
}
