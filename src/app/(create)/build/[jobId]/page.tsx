// /build/[jobId] — Phase 2 surface. Renders status while items are
// still building and the review surface once they're all ready.

import * as React from "react";
import { BuildShell } from "@/components/create/build-shell";

export default async function BuildPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  return <BuildShell jobId={jobId} />;
}
