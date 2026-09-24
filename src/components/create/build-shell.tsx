"use client";

// BuildShell — /build/[jobId]. A build lives in its chat now, so this page
// sends anyone whose browser still holds that chat straight there (keeping a
// deep link's ?tab=). It stays a page of its own only for a build whose chat
// is gone: the rail lists the pipeline and the whole-build states, and the
// canvas is the same review surface the chat shows.

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { rollupBuild, useCreateHistory } from "@/lib/create/history";
import { BuildRail } from "./build-rail";
import { BuildConceptCard, BuildStatus } from "./build-status";
import { ReviewOutputs } from "./review-outputs";
import { useBuildModel } from "./use-build-model";

export function BuildShell({ jobId }: { jobId: string }) {
  // The redirect reads `?tab=`, which needs a boundary so the route can still
  // be pre-rendered.
  return (
    <React.Suspense fallback={<LoadingShell />}>
      <BuildShellInner jobId={jobId} />
    </React.Suspense>
  );
}

function BuildShellInner({ jobId }: { jobId: string }) {
  const { hydrated, getBuild, getChat } = useCreateHistory();
  const router = useRouter();
  const query = useSearchParams();
  const job = getBuild(jobId);
  // A build lives in its chat — the conversation, the rail and the composer
  // stay with it there. This page only remains for a build whose chat this
  // browser no longer holds; anything else goes home to the chat, keeping a
  // deep link's tab.
  const chatId = job && getChat(job.chatId) ? job.chatId : null;
  React.useEffect(() => {
    if (!chatId) return;
    const tab = query.get("tab");
    router.replace(`/chat/${chatId}${tab ? `?tab=${encodeURIComponent(tab)}` : ""}`);
  }, [chatId, query, router]);
  useBuildModel(chatId ? null : job);
  // Shared between the rail and the canvas, so picking a product in one
  // moves the other. Declared before the early returns — a hook after one
  // is a hook that runs in a different order on the next render.
  const [productId, setProductId] = React.useState("primary");

  if (!hydrated || chatId) return <LoadingShell />;
  if (!job) return <NotFoundShell />;

  const rollup = rollupBuild(job);
  const ready = rollup.status === "ready";

  return (
    <div className="flex h-full">
      {/* Same two panes as the concept surface, for the same reason: the
          pipeline is a small fixed list that never changes, and the work it
          produces is what deserves the screen. The rail states the whole
          pipeline from the start — every piece, including the ones that have
          not begun — and the canvas fills in beside it as each one lands. The
          page used to be the pipeline, full width, with nothing to look at
          until the last piece finished. */}
      <aside className="flex w-[320px] shrink-0 flex-col overflow-y-auto border-r border-solid border-border bg-bg-surface">
        <div className="px-[12px] pt-[16px]">
          <BackLink />
        </div>
        <BuildRail
          job={job}
          activeProductId={productId}
          onPickProduct={setProductId}
        />
        {/* The whole-build states — queued, waiting on credits, a partial or
            system failure, and the retries they carry — stay on the card
            that was written for them; only the five-row list moved. */}
        {!ready && (
          <div className="px-[12px] pb-[16px]">
            <BuildStatus job={job} statesOnly />
          </div>
        )}
      </aside>

      <main className="flex-1 overflow-y-auto bg-bg-page">
        <div className="mx-auto w-full max-w-[920px] px-[24px] py-[24px]">
          <div className="flex flex-col gap-[16px]">
            <BuildConceptCard job={job} />
            <ReviewOutputs
              job={job}
              productId={productId}
              onProductChange={setProductId}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

// Back is where the user came from. This page only shows for a build whose
// chat is gone from this browser, so a cold open falls back to History, where
// the build is listed, rather than to a chat that no longer exists.
function BackLink() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
          return;
        }
        router.push("/history");
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
