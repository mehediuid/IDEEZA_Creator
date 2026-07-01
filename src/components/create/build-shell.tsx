"use client";

// BuildShell — the client orchestrator for /build/[jobId]. Pulls the
// job from the create history store and:
//   • While items are still building or failed → shows <BuildStatus />
//   • Once every item is ready                 → shows <ReviewOutputs />
//
// The page header carries the back-to-home link and a small breadcrumb
// to the source chat (one chat → many builds, so getting back to the
// originating concept is important).

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft01Icon,
  Clock01Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import {
  rollupBuild,
  useCreateHistory,
  type BuildJob,
} from "@/lib/create/history";
import { BuildStatus } from "./build-status";
import { ReviewOutputs } from "./review-outputs";

// Tracks jobs whose 3D generation is in flight this session, so navigating
// away and back doesn't kick off a duplicate generation.
const modelStarted = new Set<string>();

// Generate the build's 3D enclosure from its concept image, once, and store the
// resulting .glb on the job. Runs for the whole life of the build view (both
// the building and review phases) so a slow provider (Meshy) keeps going even
// after the simulated items report "ready".
function useBuildModel(job: BuildJob | null) {
  const { setBuildModel } = useCreateHistory();
  const jobId = job?.id;
  const conceptImageUrl = job?.conceptImageUrl;
  const hasModel = Boolean(job?.modelGlbUrl);

  React.useEffect(() => {
    if (!jobId || !conceptImageUrl || hasModel) return;
    if (modelStarted.has(jobId)) return;
    modelStarted.add(jobId);

    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/three/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: conceptImageUrl }),
        });
        if (!res.ok) throw new Error("create failed");
        const { provider, taskId } = (await res.json()) as {
          provider: string;
          taskId: string;
        };
        const poll = async () => {
          if (!alive) return;
          try {
            const r = (await fetch(
              `/api/three/generate?provider=${provider}&taskId=${encodeURIComponent(taskId)}`,
            ).then((x) => x.json())) as { status: string; glbUrl?: string };
            if (!alive) return;
            if (r.status === "ready" && r.glbUrl) {
              setBuildModel(jobId, r.glbUrl);
              return;
            }
            if (r.status === "failed") {
              modelStarted.delete(jobId); // allow a later retry
              return;
            }
            setTimeout(poll, 2500);
          } catch {
            if (alive) setTimeout(poll, 3500);
          }
        };
        setTimeout(poll, 1500);
      } catch {
        modelStarted.delete(jobId);
      }
    })();

    return () => {
      alive = false;
    };
  }, [jobId, conceptImageUrl, hasModel, setBuildModel]);
}

export function BuildShell({ jobId }: { jobId: string }) {
  const { hydrated, getBuild } = useCreateHistory();
  const job = getBuild(jobId);
  useBuildModel(job);

  if (!hydrated) return <LoadingShell />;
  if (!job) return <NotFoundShell />;

  const rollup = rollupBuild(job);
  const ready = rollup.status === "ready";

  return (
    <div className="flex h-full flex-col">
      <Header job={job} />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[920px] px-[24px] py-[32px]">
          {ready ? <ReviewOutputs job={job} /> : <BuildStatus job={job} />}
        </div>
      </div>
    </div>
  );
}

function Header({ job }: { job: BuildJob }) {
  return (
    <header className="flex items-center gap-[16px] border-b border-border bg-bg-page px-[24px] py-[12px]">
      <Link
        href="/"
        aria-label="Back to Home"
        className="inline-flex h-[36px] w-[36px] items-center justify-center rounded-lg text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-surface-raised hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <Icon icon={ArrowLeft01Icon} />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-2xs font-bold uppercase tracking-wider text-text-tertiary">
          Project build
        </p>
        <h1 className="truncate text-md font-semibold text-text-primary">
          {prettyTitle(job.conceptPrompt)}
        </h1>
      </div>
      <Link
        href={`/chat/${job.chatId}`}
        className="inline-flex h-[32px] items-center gap-[8px] rounded-full border border-border bg-bg-surface px-[12px] text-2xs font-bold uppercase tracking-wider text-text-secondary outline-none transition-colors duration-fast hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <Icon icon={Clock01Icon} size={14} />
        Source chat
      </Link>
    </header>
  );
}

function LoadingShell() {
  return (
    <div className="flex h-full items-center justify-center text-md text-text-tertiary">
      Loading build…
    </div>
  );
}

function NotFoundShell() {
  return (
    <div className="mx-auto flex h-full max-w-[480px] flex-col items-center justify-center gap-[16px] px-[24px] text-center">
      <p className="text-2xs font-bold uppercase tracking-wider text-text-tertiary">
        Project build
      </p>
      <h1 className="text-2xl font-bold text-text-primary">
        We couldn&apos;t find this build
      </h1>
      <p className="text-md text-text-secondary">
        It may have been cleared from this browser. Start a new build from
        any concept image.
      </p>
      <Link
        href="/"
        className="inline-flex h-[40px] items-center gap-[8px] rounded-lg bg-violet-600 px-[16px] text-md font-semibold text-text-on-brand outline-none transition-colors duration-fast hover:bg-violet-500 focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        Back to Home
      </Link>
    </div>
  );
}

function prettyTitle(prompt: string): string {
  const t = prompt.trim().replace(/\s+/g, " ");
  return t.length > 80 ? `${t.slice(0, 80)}…` : t;
}
