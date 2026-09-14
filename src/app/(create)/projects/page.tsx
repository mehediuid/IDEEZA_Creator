// /projects — "My projects". The shell is the User Panel V2 surface
// (Figma node 16838:392921); the content is the user's real projects,
// read from the ManualProjects store by the MyProjects client component.

import * as React from "react";
import { MyProjects } from "@/components/projects/my-projects";

export default function ProjectsPage() {
  return <MyProjects />;
}
