"use client";

// ProductFlowProvider — single source of truth for the end-to-end product
// creation wizard: PCB → Code → 3D → Preview → Brief.
//
// Per the latest spec (per-project flow state), this provider is now a
// thin VIEW over the active ManualProject's flowState — the actual
// storage lives in `useManualProjects()`. Calling `markCompleted` here
// updates the active project's state in the manual-projects store, so
// switching projects naturally swaps the progress users see.
//
// If there is no active project (e.g. user landed before selecting one
// — which the RequireActiveProject gate prevents anyway), `state` is
// the empty default and mutations are no-ops.

import * as React from "react";
import {
  EMPTY_FLOW_STATE,
  FLOW_STEPS,
  SEGMENT_TO_STEP,
  STEP_LABELS,
  firstIncompleteStep,
  useManualProjects,
  type ManualFlowState,
} from "@/lib/manual/projects";

export type FlowStep = keyof ManualFlowState;

export const FLOW_ORDER: FlowStep[] = FLOW_STEPS;
export const FLOW_LABELS: Record<FlowStep, string> = {
  pcb: STEP_LABELS.pcb.replace(" Design", ""), // back-compat short labels
  code: STEP_LABELS.code,
  three: "3D",
  preview: "Preview",
  wiring: "Wiring",
  brief: "Brief",
};
// Inverse lookup: given a pathname, return the matching FlowStep or null.
// Handles both the project-scoped route (/project/<slug>/<segment>) and the
// legacy flat routes (/pcb, /code, /3d, /preview, /brief) that still redirect.
export function stepFromPath(pathname: string | null): FlowStep | null {
  if (!pathname) return null;
  const scoped = pathname.match(/^\/project\/[^/]+\/([^/]+)/);
  if (scoped) return SEGMENT_TO_STEP[scoped[1]] ?? null;
  const legacy = pathname.match(/^\/(pcb|code|3d|preview|wiring|brief)(?:\/|$)/);
  if (legacy) return SEGMENT_TO_STEP[legacy[1]] ?? null;
  return null;
}

export function nextStep(step: FlowStep): FlowStep | null {
  const idx = FLOW_ORDER.indexOf(step);
  if (idx < 0 || idx >= FLOW_ORDER.length - 1) return null;
  return FLOW_ORDER[idx + 1];
}

export function prevStep(step: FlowStep): FlowStep | null {
  const idx = FLOW_ORDER.indexOf(step);
  if (idx <= 0) return null;
  return FLOW_ORDER[idx - 1];
}

export type FlowState = ManualFlowState & { startedAt: number | null };

const DEFAULT_VIEW_STATE: FlowState = {
  ...EMPTY_FLOW_STATE,
  startedAt: null,
};

type Ctx = {
  state: FlowState;
  hydrated: boolean;
  markCompleted: (step: FlowStep) => void;
  resetFlow: () => void;
  isAnyStarted: () => boolean;
  firstIncomplete: () => FlowStep;
};

const FlowContext = React.createContext<Ctx | null>(null);

export function ProductFlowProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    hydrated,
    activeProject,
    activeProjectId,
    markStepCompleted,
    updateProject,
  } = useManualProjects();

  const state: FlowState = React.useMemo(() => {
    if (!activeProject) return DEFAULT_VIEW_STATE;
    return {
      ...activeProject.flowState,
      startedAt: activeProject.createdAt,
    };
  }, [activeProject]);

  const markCompleted = React.useCallback(
    (step: FlowStep) => {
      if (!activeProjectId) return;
      markStepCompleted(activeProjectId, step);
    },
    [activeProjectId, markStepCompleted],
  );

  const resetFlow = React.useCallback(() => {
    if (!activeProjectId) return;
    updateProject(activeProjectId, { flowState: { ...EMPTY_FLOW_STATE } });
  }, [activeProjectId, updateProject]);

  const isAnyStarted = React.useCallback(() => {
    if (!activeProject) return false;
    return FLOW_ORDER.some((s) => activeProject.flowState[s]);
  }, [activeProject]);

  const firstIncomplete = React.useCallback((): FlowStep => {
    if (!activeProject) return "pcb";
    return firstIncompleteStep(activeProject);
  }, [activeProject]);

  const value: Ctx = React.useMemo(
    () => ({
      state,
      hydrated,
      markCompleted,
      resetFlow,
      isAnyStarted,
      firstIncomplete,
    }),
    [state, hydrated, markCompleted, resetFlow, isAnyStarted, firstIncomplete],
  );

  return (
    <FlowContext.Provider value={value}>{children}</FlowContext.Provider>
  );
}

export function useProductFlow(): Ctx {
  const ctx = React.useContext(FlowContext);
  if (!ctx) {
    throw new Error("useProductFlow must be used inside <ProductFlowProvider>");
  }
  return ctx;
}
