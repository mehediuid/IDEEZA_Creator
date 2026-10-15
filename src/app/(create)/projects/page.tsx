// /projects — "My projects" (spec §3.2, §5.2). MyProjects reads its view —
// tab, search, sort, source and page — from the URL with `useSearchParams`,
// so it sits in a Suspense boundary: the route shell still prerenders, and a
// production build refuses the hook without one. The fallback is the page's
// own frame, header and skeleton grid, so the title is already where it stays.

import * as React from "react";
import type { Metadata } from "next";
import { Page } from "@/components/ideeza/page";
import { MyProjects, ProjectsHeader, ProjectsSkeleton } from "@/components/projects/my-projects";

export const metadata: Metadata = {
  title: "My projects · IDEEZA",
};

export default function ProjectsPage() {
  return (
    <React.Suspense
      fallback={
        <Page>
          <ProjectsHeader />
          <ProjectsSkeleton />
        </Page>
      }
    >
      <MyProjects />
    </React.Suspense>
  );
}
