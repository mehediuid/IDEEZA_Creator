// /projects — "My projects" (spec §3.2, §5.2). MyProjects reads its view —
// tab, search, sort, source and page — from the URL with `useSearchParams`,
// so it sits in a Suspense boundary: the route shell still prerenders, and a
// production build refuses the hook without one.

import * as React from "react";
import type { Metadata } from "next";
import { MyProjects } from "@/components/projects/my-projects";

export const metadata: Metadata = {
  title: "My projects · IDEEZA",
};

export default function ProjectsPage() {
  return (
    <React.Suspense
      fallback={<div className="mx-auto w-full max-w-[1280px] px-[16px] py-[28px] min-[640px]:px-[32px]" />}
    >
      <MyProjects />
    </React.Suspense>
  );
}
