"use client";

// /build/[jobId]/brief — where "Save Project" lands a finished build.
//
// The build stays in the URL because the flow is about the build: it has
// no project yet, and the Brief's Step 1 is what gives it one. The route
// sits in the (create) group, so the shell is the same dashboard sidebar
// the build's review surface uses — no editor chrome, which is the whole
// point (the module and step rails belong to a project, and there isn't
// one to rail through yet).
//
// A build nobody can review has no brief to write: one still building goes
// back to its chat (or to /build/<id> when the chat is gone, which also says
// when an id is unknown).

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { rollupBuild, useCreateHistory } from "@/lib/create/history";

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
  const job = getBuild(jobId);
  const ready = job ? rollupBuild(job).status === "ready" : false;
  // Not ready yet: back to where the build is — its chat when this browser
  // holds it.
  const home = job && getChat(job.chatId) ? `/chat/${job.chatId}` : `/build/${jobId}`;

  React.useEffect(() => {
    if (!hydrated || ready) return;
    router.replace(home);
  }, [hydrated, ready, home, router]);

  if (!hydrated) return <Blank label="Loading brief…" />;
  if (!ready) return <Blank label="Opening the build…" />;
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
