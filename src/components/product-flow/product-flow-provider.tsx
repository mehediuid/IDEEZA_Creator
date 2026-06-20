"use client";

// ProductFlowProvider — single source of truth for the end-to-end product
// creation wizard: PCB → Code → 3D → Preview → Brief. Each step is a route;
// the provider just tracks which steps are completed so the FlowStepper and
// FlowContinueButton can render correctly and the user can be sent to the
// right place from the home page ("Continue where you left off").
//
// The current step is derived from the URL — never stored here — so back/
// forward navigation behaves correctly and is reliable across reloads.

import * as React from "react";

export type FlowStep = "pcb" | "code" | "three" | "preview" | "brief";

export const FLOW_ORDER: FlowStep[] = [
  "pcb",
  "code",
  "three",
  "preview",
  "brief",
];

export const FLOW_LABELS: Record<FlowStep, string> = {
  pcb: "PCB",
  code: "Code",
  three: "3D",
  preview: "Preview",
  brief: "Brief",
};

export const FLOW_HREFS: Record<FlowStep, string> = {
  pcb: "/pcb",
  code: "/code",
  three: "/3d",
  preview: "/preview",
  brief: "/brief",
};

// Inverse lookup: given a pathname, return the matching FlowStep or null.
export function stepFromPath(pathname: string | null): FlowStep | null {
  if (!pathname) return null;
  for (const step of FLOW_ORDER) {
    if (pathname === FLOW_HREFS[step] || pathname.startsWith(FLOW_HREFS[step] + "/")) {
      return step;
    }
  }
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

export type FlowState = {
  pcb: boolean;
  code: boolean;
  three: boolean;
  preview: boolean;
  brief: boolean;
  startedAt: number | null;
};

const DEFAULT_STATE: FlowState = {
  pcb: false,
  code: false,
  three: false,
  preview: false,
  brief: false,
  startedAt: null,
};

const STORAGE_KEY = "ideeza:product:flow";

function loadState(): FlowState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...(parsed || {}) };
  } catch {
    return DEFAULT_STATE;
  }
}

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
  const [state, setState] = React.useState<FlowState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state, hydrated]);

  const markCompleted = React.useCallback((step: FlowStep) => {
    setState((s) => ({
      ...s,
      [step]: true,
      startedAt: s.startedAt ?? Date.now(),
    }));
  }, []);

  const resetFlow = React.useCallback(() => {
    setState(DEFAULT_STATE);
  }, []);

  const isAnyStarted = React.useCallback(
    () =>
      FLOW_ORDER.some((step) => state[step as keyof FlowState] === true) ||
      state.startedAt !== null,
    [state],
  );

  const firstIncomplete = React.useCallback((): FlowStep => {
    for (const step of FLOW_ORDER) {
      if (!state[step as keyof FlowState]) return step;
    }
    return "brief";
  }, [state]);

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
