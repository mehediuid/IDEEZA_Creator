"use client";

// CreatePlanProvider — the user's current generation plan (placeholder
// for now) + daily prompt usage with a midnight reset. Powers the
// QuotaCard at the top of /history and is incremented each time the
// concept chat runs a generation.
//
// Today this lives entirely client-side (localStorage), so the value
// is the user's own usage record. When real auth lands, swap to a
// server-fed snapshot — the consumer hook stays the same.

import * as React from "react";

export type PlanTier = "Free" | "Plus" | "Pro";

export type CreatePlanState = {
  plan: PlanTier;
  dailyLimit: number;
  promptsUsedToday: number;
  nextResetAt: number; // ms-since-epoch (next local midnight)
};

const STORAGE_KEY = "ideeza:create:plan";

const DEFAULT_STATE: CreatePlanState = {
  plan: "Free",
  dailyLimit: 5,
  promptsUsedToday: 0,
  nextResetAt: 0,
};

function nextMidnight(now: Date = new Date()): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime();
}

function loadStored(): CreatePlanState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE, nextResetAt: nextMidnight() };
    const parsed = JSON.parse(raw) as Partial<CreatePlanState>;
    return {
      plan: (parsed.plan as PlanTier) ?? DEFAULT_STATE.plan,
      dailyLimit: parsed.dailyLimit ?? DEFAULT_STATE.dailyLimit,
      promptsUsedToday: parsed.promptsUsedToday ?? 0,
      nextResetAt: parsed.nextResetAt ?? nextMidnight(),
    };
  } catch {
    return { ...DEFAULT_STATE, nextResetAt: nextMidnight() };
  }
}

type Ctx = {
  hydrated: boolean;
  state: CreatePlanState;
  // Returns true when the increment was accepted, false when the user
  // is already at their daily cap (callers can decide what to do).
  incrementPrompt: () => boolean;
};

const CreatePlanContext = React.createContext<Ctx | null>(null);

export function CreatePlanProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = React.useState<CreatePlanState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = React.useState(false);

  // Hydrate once. If the stored reset timestamp has passed (e.g. the
  // user came back the next day), reset counters before exposing state.
  React.useEffect(() => {
    const stored = loadStored();
    if (stored.nextResetAt <= Date.now()) {
      stored.promptsUsedToday = 0;
      stored.nextResetAt = nextMidnight();
    }
    setState(stored);
    setHydrated(true);
  }, []);

  // Persist on change post-hydration.
  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state, hydrated]);

  // Auto-roll the counters at midnight. We poll every 30s rather than
  // scheduling a timeout — keeps the logic correct after suspend/wake.
  React.useEffect(() => {
    if (!hydrated) return;
    const tick = () => {
      setState((prev) => {
        if (Date.now() < prev.nextResetAt) return prev;
        return {
          ...prev,
          promptsUsedToday: 0,
          nextResetAt: nextMidnight(),
        };
      });
    };
    const id = window.setInterval(tick, 30_000);
    tick();
    return () => window.clearInterval(id);
  }, [hydrated]);

  const incrementPrompt = React.useCallback(() => {
    let accepted = false;
    setState((prev) => {
      if (prev.promptsUsedToday >= prev.dailyLimit) return prev;
      accepted = true;
      return {
        ...prev,
        promptsUsedToday: prev.promptsUsedToday + 1,
      };
    });
    return accepted;
  }, []);

  const value: Ctx = { hydrated, state, incrementPrompt };
  return (
    <CreatePlanContext.Provider value={value}>
      {children}
    </CreatePlanContext.Provider>
  );
}

export function useCreatePlan(): Ctx {
  const ctx = React.useContext(CreatePlanContext);
  if (!ctx) {
    throw new Error("useCreatePlan must be used inside <CreatePlanProvider>");
  }
  return ctx;
}
