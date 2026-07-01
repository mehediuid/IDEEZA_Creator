// /projects — "My projects" surface (User Panel V2, Figma node
// 16838:392921). Renders the MyProjects grid: scope tabs, search +
// Sort By / Status, the project-card grid, the Utility NFT variant, and
// pagination — all in the existing IDEEZA design-system style.
//
// The earlier manual-projects list still lives at
// `@/components/manual/projects-list` (ProjectsList) if it's needed again.

import * as React from "react";
import { MyProjects } from "@/components/projects/my-projects";

export default function ProjectsPage() {
  return <MyProjects />;
}
