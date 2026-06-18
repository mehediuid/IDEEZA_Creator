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
// flip DEMO_SPEED to 1 for real backend integration.

import * as React from "react";

export type VideoJobStage =
  | "queued"
  | "drafting"
  | "rendering"
  | "audio"
  | "encoding"
  | "done"
  | "failed";

export type VideoJob = {
  id: string;
  title: string;
  prompt: string;
  quality: "low" | "high";
  stage: VideoJobStage;
  startedAt: number;
  stageStartedAt: number;
  emailReminder: string | null;
  browserNotify: boolean;
  acknowledged: boolean;
  // True once the brief that owns this job completes its mint step. Once
  // minted, the user's regenerate flow takes a different path: in-place modal
  // (no /brief navigation) since the brief is "done" and they're just swapping
  // the listing's video.
  minted: boolean;
};

export const STAGE_BUDGETS_SEC: Record<
  Exclude<VideoJobStage, "done" | "failed">,
  number
> = {
  queued: 30,
  drafting: 90,
  rendering: 600,
  audio: 300,
  encoding: 180,
};

export const STAGE_LABELS: Record<VideoJobStage, string> = {
  queued: "Queued",
  drafting: "Drafting visual sequences",
  rendering: "Rendering frames",
  audio: "Synthesizing audio",
  encoding: "Encoding & finalising",
  done: "Ready",
  failed: "Failed",
};

export const STAGE_ORDER: VideoJobStage[] = [
  "queued",
  "drafting",
  "rendering",
  "audio",
  "encoding",
];

export const TOTAL_RENDER_SECONDS = Object.values(STAGE_BUDGETS_SEC).reduce(
  (a, b) => a + b,
  0,
);

// Demo speed: scales the 20-min flow to ~30s. Set to 1 for real backend.
const DEMO_SPEED = 40;

export function progressOf(
  job: VideoJob | null,
  now: number = Date.now(),
): {
  total: number;
  stageElapsedSec: number;
  stageBudget: number;
  etaSec: number;
} {
  if (!job || job.stage === "done")
    return { total: 100, stageElapsedSec: 0, stageBudget: 1, etaSec: 0 };
  if (job.stage === "failed")
    return { total: 0, stageElapsedSec: 0, stageBudget: 1, etaSec: 0 };
  const elapsedSec = ((now - job.startedAt) / 1000) * DEMO_SPEED;
  const total = Math.min(99, (elapsedSec / TOTAL_RENDER_SECONDS) * 100);
  const stageBudget = STAGE_BUDGETS_SEC[job.stage];
  const stageElapsedSec = Math.min(
    stageBudget,
    ((now - job.stageStartedAt) / 1000) * DEMO_SPEED,
  );
  const etaSec = Math.max(0, TOTAL_RENDER_SECONDS - elapsedSec);
  return { total, stageElapsedSec, stageBudget, etaSec };
}

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
