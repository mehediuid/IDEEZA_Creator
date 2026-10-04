"use client";

// /build/[jobId]/brief — the Brief of a saved build.
//
// The build stays in the URL because the flow is about the build. The route
// sits in the (create) group, so the shell is the same dashboard sidebar
// the build's review surface uses — no editor chrome.
//
// A Brief always has its project before Step 1 renders (P2-SAVE-12): a
// ready build that no project holds — never saved, or its project deleted —
// goes to its review with `?save=1`, which opens the save step there
// (P2-SAVE-13). A build nobody can review has no brief to write: one still
// building goes back to its chat (or to /build/<id> when the chat is gone,
// which also says when an id is unknown). A build held by a project minted
// without a Brief — from its page — goes to that project's Brief address,
// which says there is none (R2-8): never an editable Step 1.

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { rollupBuild, useCreateHistory } from "@/lib/create/history";
import { stepHref, useManualProjects } from "@/lib/manual/projects";
import { holderOf } from "@/lib/manual/save-step";
import { useBriefOpens } from "@/components/brief/use-brief-opens";

// Same treatment as every other editor app: the Brief reads localStorage
// on mount, so it is a client-only tree.
const BriefApp = dynamic(
  () => import("@/components/brief/brief-app").then((m) => m.BriefApp),
  { ssr: false, loading: () => <Blank label="Loading brief…" /> },
);

export default function BuildBriefPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = React.use(params);
  const router = useRouter();
  const { hydrated, getBuild, getChat } = useCreateHistory();
  const { hydrated: projectsHydrated, projects } = useManualProjects();
  const job = getBuild(jobId);
  const ready = job ? rollupBuild(job).status === "ready" : false;
  const holder = job ? holderOf(job, projects) : null;
  const held = holder !== null;
  // Not ready yet: back to where the build is — its chat when this browser
  // holds it.
  const home = job && getChat(job.chatId) ? `/chat/${job.chatId}` : `/build/${jobId}`;
  const read = hydrated && projectsHydrated;
  const opens = useBriefOpens(read && ready ? holder : null);
  const noBrief = opens === false && holder ? stepHref(holder, "brief") : null;

  React.useEffect(() => {
    if (!read) return;
    if (!ready) router.replace(home);
    // Ready, and no project holds it: save it first, then its Brief is the
    // project page's main button (P2-SAVE-13).
    else if (!held) router.replace(`/build/${jobId}?save=1`);
    else if (noBrief) router.replace(noBrief);
  }, [read, ready, held, home, jobId, noBrief, router]);

  if (!read) return <Blank label="Loading brief…" />;
  if (!ready) return <Blank label="Opening the build…" />;
  if (!held) return <Blank label="Opening the save step…" />;
  if (opens !== true) return <Blank label="Loading brief…" />;
  return <BriefApp buildId={jobId} />;
}

// The Brief's own shape while it loads — the step line and the card — not a
// line of centred text.
function Blank({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="flex min-h-full w-full flex-col items-center gap-[24px] bg-bg-page px-[32px] pb-[64px] pt-[40px] motion-safe:animate-pulse"
    >
      <span className="sr-only">{label}</span>
      <div className="h-[14px] w-full max-w-[600px] rounded bg-bg-subtle" />
      <div className="h-[420px] w-full max-w-[600px] rounded-2xl bg-bg-subtle" />
    </div>
  );
}
