"use client";

// VideoJobsProvider — global, cross-page video-render job store.
//
// Lives at the root of the app so that once a user kicks off a render (from
// /brief Step 3), the job survives navigation: the indicator + ticker keep
// running on /pcb, /code, /3d, or any other page. Jobs persist to localStorage
// so a reload also recovers them (mid-flight jobs resume their stage timer
// where they left off).
//
// The ticker advances stages on a fixed 500ms cadence. A demo speed multiplier
// turns the production budget (20 min) into a ~30-second demo for testing —
// flip `DEMO_SPEED` (in `lib/video/jobs`) to 1 for real backend integration.

import * as React from "react";
// The job model and its progress maths live in `lib/video/jobs` — pure, so the
// project page's Outcome read computes the same progress this ticker drives.
// Re-exported here, so every `video-jobs-provider` import keeps working.
import {
  DEMO_SPEED,
  STAGE_BUDGETS_SEC,
  STAGE_ORDER,
  type VideoJob,
  type VideoJobStage,
} from "@/lib/video/jobs";

export {
  STAGE_BUDGETS_SEC,
  STAGE_LABELS,
  STAGE_ORDER,
  TOTAL_RENDER_SECONDS,
  etaLabel,
  progressOf,
  type VideoJob,
  type VideoJobStage,
} from "@/lib/video/jobs";

type Ctx = {
  jobs: VideoJob[];
  hydrated: boolean;
  createJob: (spec: {
    title: string;
    prompt: string;
    quality: "low" | "high";
    minted?: boolean;
  }) => string;
  setEmailReminder: (id: string, email: string | null) => void;
  setBrowserNotify: (id: string, enabled: boolean) => void;
  acknowledge: (id: string) => void;
  markMinted: (id: string) => void;
  dismiss: (id: string) => void;
};

const VideoJobsContext = React.createContext<Ctx | null>(null);

const STORAGE_KEY = "ideeza:videoJobs";

function loadJobs(): VideoJob[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as VideoJob[];
  } catch {
    return [];
  }
}

export function VideoJobsProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = React.useState<VideoJob[]>([]);
  const [hydrated, setHydrated] = React.useState(false);

  // Hydrate from localStorage after mount.
  React.useEffect(() => {
    // Reading localStorage in the state initialiser would render different
    // markup on the server and the client — so the store hydrates here, once,
    // after mount, on purpose.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setJobs(loadJobs());
    setHydrated(true);
  }, []);

  // Persist whenever jobs change.
  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
    } catch {}
  }, [jobs, hydrated]);

  // Single global ticker advances every active job. Stays mounted while at
  // least one job is active; bails when every job is done/failed.
  const hasActive = jobs.some(
    (j) => j.stage !== "done" && j.stage !== "failed",
  );
  React.useEffect(() => {
    if (!hydrated || !hasActive) return;
    const id = window.setInterval(() => {
      const now = Date.now();
      setJobs((prev) => {
        let mutated = false;
        const next = prev.map((j) => {
          if (j.stage === "done" || j.stage === "failed") return j;
          const stageBudget =
            STAGE_BUDGETS_SEC[
              j.stage as Exclude<VideoJobStage, "done" | "failed">
            ];
          const stageElapsedSec =
            ((now - j.stageStartedAt) / 1000) * DEMO_SPEED;
          if (stageElapsedSec < stageBudget) return j;
          mutated = true;
          const idx = STAGE_ORDER.indexOf(j.stage);
          const nextStage = STAGE_ORDER[idx + 1] as VideoJobStage | undefined;
          if (nextStage) {
            return { ...j, stage: nextStage, stageStartedAt: now };
          }
          // Final stage just finished — mark done. Fire a browser notification
          // if the user opted in and the tab is hidden.
          if (
            j.browserNotify &&
            typeof window !== "undefined" &&
            "Notification" in window &&
            document.hidden
          ) {
            try {
              new Notification("Your IDEEZA video is ready", {
                body: j.title
                  ? `${j.title} — tap to review.`
                  : "Tap to review.",
              });
            } catch {}
          }
          return { ...j, stage: "done" as VideoJobStage };
        });
        // Always return a new array so progress-derived components re-render
        // even when no stage flipped — the elapsed-time tick is what drives
        // the progress bar between flips.
        return mutated ? next : [...prev];
      });
    }, 500);
    return () => window.clearInterval(id);
  }, [hydrated, hasActive]);

  const createJob = React.useCallback(
    (spec: {
      title: string;
      prompt: string;
      quality: "low" | "high";
      minted?: boolean;
    }) => {
      const now = Date.now();
      const id = `vj_${now.toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
      setJobs((prev) => [
        ...prev,
        {
          id,
          title: spec.title,
          prompt: spec.prompt,
          quality: spec.quality,
          stage: "queued",
          startedAt: now,
          stageStartedAt: now,
          emailReminder: null,
          browserNotify: false,
          acknowledged: false,
          minted: !!spec.minted,
        },
      ]);
      return id;
    },
    [],
  );

  const setEmailReminder = React.useCallback(
    (id: string, email: string | null) => {
      setJobs((prev) =>
        prev.map((j) => (j.id === id ? { ...j, emailReminder: email } : j)),
      );
    },
    [],
  );

  const setBrowserNotify = React.useCallback(
    (id: string, enabled: boolean) => {
      if (
        enabled &&
        typeof window !== "undefined" &&
        "Notification" in window
      ) {
        if (Notification.permission === "default")
          Notification.requestPermission().catch(() => undefined);
      }
      setJobs((prev) =>
        prev.map((j) => (j.id === id ? { ...j, browserNotify: enabled } : j)),
      );
    },
    [],
  );

  const acknowledge = React.useCallback((id: string) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, acknowledged: true } : j)),
    );
  }, []);

  const markMinted = React.useCallback((id: string) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, minted: true } : j)),
    );
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }, []);

  const value: Ctx = React.useMemo(
    () => ({
      jobs,
      hydrated,
      createJob,
      setEmailReminder,
      setBrowserNotify,
      acknowledge,
      markMinted,
      dismiss,
    }),
    [
      jobs,
      hydrated,
      createJob,
      setEmailReminder,
      setBrowserNotify,
      acknowledge,
      markMinted,
      dismiss,
    ],
  );

  return (
    <VideoJobsContext.Provider value={value}>
      {children}
    </VideoJobsContext.Provider>
  );
}

export function useVideoJobs(): Ctx {
  const ctx = React.useContext(VideoJobsContext);
  if (!ctx)
    throw new Error("useVideoJobs must be used inside <VideoJobsProvider>");
  return ctx;
}
