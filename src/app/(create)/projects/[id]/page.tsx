// /projects/[id] — one project's detail view. Thin server wrapper; the
// id is resolved against the ManualProjects store inside ProjectDetails,
// which shows a not-found state when nothing matches.

import * as React from "react";
import { ProjectDetails } from "@/components/projects/project-details";

export default async function ProjectDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectDetails id={id} />;
}
