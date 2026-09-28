// /projects/[id] — one project's page. A thin server wrapper: the id is
// resolved against the ManualProjects store inside ProjectPage, which shows the
// loading skeleton until every store is read, a not-found state when nothing
// matches, and otherwise the page's shell (spec §5.3).

import type { Metadata } from "next";
import * as React from "react";
import { ProjectPage } from "@/components/projects/details/project-page";

// Before the store is read the page can't know the project's name; the client
// sets "{project} · My projects · IDEEZA" once it does (COR-3).
export const metadata: Metadata = { title: "My projects · IDEEZA" };

export default async function ProjectDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectPage id={id} />;
}
