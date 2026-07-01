// /projects/[id] — "Project Details" surface from User Panel V2 (Figma
// node 16838:306201). Thin server wrapper; the interactive detail view
// lives in the ProjectDetails client component, rendered in the existing
// IDEEZA design-system style.

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
