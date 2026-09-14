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
// A build nobody can review has no brief to write: an unknown id, or one
// still building, goes back to /build/<id>, which says which it is.

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
  const { hydrated, getBuild } = useCreateHistory();
  const job = getBuild(jobId);
  const ready = job ? rollupBuild(job).status === "ready" : false;

  React.useEffect(() => {
    if (!hydrated || ready) return;
    router.replace(`/build/${jobId}`);
  }, [hydrated, ready, jobId, router]);

  if (!hydrated) return <Blank label="Loading brief…" />;
  if (!ready) return <Blank label="Opening the build…" />;
  return <BriefApp buildId={jobId} />;
}

function Blank({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex h-full w-full items-center justify-center bg-bg-page text-md text-text-tertiary"
    >
      {label}
    </div>
  );
}
