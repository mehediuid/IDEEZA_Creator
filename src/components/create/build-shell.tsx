"use client";

// BuildShell — the client orchestrator for /build/[jobId]. Pulls the
// job from the create history store and:
//   • While items are still building or failed → shows <BuildStatus />
//   • Once every item is ready                 → shows <ReviewOutputs />
//
// The page is one centred card under a plain "← Back" link (Ai-Flow
// frames 11–14): back means where you came from, which for a build
// opened straight from its concept is the source chat.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import {
  rollupBuild,
  useCreateHistory,
  type BuildJob,
} from "@/lib/create/history";
import { BuildConceptCard, BuildStatus } from "./build-status";
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
    <div className="h-full overflow-y-auto">
      {/* The review surface is a wider reading layout than the five
          progress rows; the build states themselves are one 580px card. */}
      <div
        className={[
          "mx-auto w-full px-[24px] py-[24px]",
          ready ? "max-w-[920px]" : "max-w-[580px]",
        ].join(" ")}
      >
        <BackLink job={job} />
        <div className="mt-[12px] flex flex-col gap-[16px]">
          {ready ? (
            <>
              <BuildConceptCard job={job} />
              <ReviewOutputs job={job} />
            </>
          ) : (
            <BuildStatus job={job} />
          )}
        </div>
      </div>
    </div>
  );
}

// Back is where the user came from. A build opened from its concept has
// that chat one step back; a build opened cold (a link, a reload) has
// nothing to go back to, so it falls back to the chat the build belongs
// to rather than dropping the user on an unrelated page.
function BackLink({ job }: { job: BuildJob }) {
  const router = useRouter();
  const chatHref = `/chat/${job.chatId}`;
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
          return;
        }
        router.push(chatHref);
      }}
      className="inline-flex h-[32px] items-center gap-[8px] rounded-lg px-[8px] text-md font-semibold text-text-primary outline-none transition-colors duration-fast hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      <Icon icon={ArrowLeft02Icon} size={18} />
      Back
    </button>
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
