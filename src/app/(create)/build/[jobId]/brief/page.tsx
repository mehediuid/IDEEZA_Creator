"use client";

// /build/[jobId]/brief — the old address of a saved build's Brief. The Brief is
// Earn's mint flow now (Build and Earn P1-2), so this only redirects:
//
// - a build held by a project → that project's /projects/<id>/earn/mint. A
//   draft the build kept under its own key, from before a build's Brief was
//   its project's, carries its chosen intent across once (`adoptBuildIntent`);
// - a ready build no project holds — never saved, or its project deleted —
//   → its review with `?save=1`, which opens the save step (P2-SAVE-13);
// - a build still building → its chat (or /build/<id> when the chat is gone,
//   which also says when an id is unknown).

import * as React from "react";
import { useRouter } from "next/navigation";
import { adoptBuildIntent } from "@/lib/brief/mint-flow";
import { briefDraftKey, buildDraftScope } from "@/lib/brief/types";
import { rollupBuild, useCreateHistory } from "@/lib/create/history";
import { earnMintHref } from "@/lib/manual/earn-route";
import { useManualProjects } from "@/lib/manual/projects";
import { holderOf } from "@/lib/manual/save-step";

/** Carries a build-keyed draft's intent onto its project's draft once, then removes it. */
function carryBuildDraft(buildId: string, projectId: string) {
  try {
    const storage = window.localStorage;
    const buildKey = briefDraftKey(buildDraftScope(buildId));
    const buildRaw = storage.getItem(buildKey);
    if (buildRaw === null) return;
    const projectKey = briefDraftKey(projectId);
    const next = adoptBuildIntent(storage.getItem(projectKey), buildRaw);
    if (next !== null) storage.setItem(projectKey, next);
    storage.removeItem(buildKey);
  } catch {}
}

export default function BuildBriefPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = React.use(params);
  const router = useRouter();
  const { hydrated, getBuild, getChat } = useCreateHistory();
  const { hydrated: projectsHydrated, projects } = useManualProjects();
  const job = getBuild(jobId);
  const ready = job ? rollupBuild(job).status === "ready" : false;
  const holderId = job ? (holderOf(job, projects)?.id ?? null) : null;
  // Not ready yet: back to where the build is — its chat when this browser holds it.
  const home = job && getChat(job.chatId) ? `/chat/${job.chatId}` : `/build/${jobId}`;
  const read = hydrated && projectsHydrated;
  const target = !read ? null : !ready ? home : holderId ? earnMintHref(holderId) : `/build/${jobId}?save=1`;

  React.useEffect(() => {
    if (!target) return;
    if (ready && holderId) carryBuildDraft(jobId, holderId);
    router.replace(target);
  }, [target, ready, holderId, jobId, router]);

  const label = !read
    ? "Loading…"
    : !ready
      ? "Opening the build…"
      : holderId
        ? "Opening the mint flow…"
        : "Opening the save step…";
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-full w-full items-center justify-center px-[16px] py-[48px] text-md text-text-tertiary"
    >
      {label}
    </div>
  );
}
