"use client";

// The products' videos dialog behind Make videos (make-videos.tsx), loaded on
// its first open: the ReadinessDialog for the videos alone, over the project
// page's own derivation.

import * as React from "react";
import { ReadinessDialog } from "./details/readiness-dialog";
import { useProjectPageData } from "./details/use-project-page-data";
import type { VideosRequest } from "./make-videos";

export function VideosDialog({ request, onEnd }: { request: VideosRequest; onEnd: () => void }) {
  const data = useProjectPageData(request.projectId, "project");
  const close = (done: boolean) => {
    onEnd();
    if (done) request.announce?.("Every product has its video.");
    requestAnimationFrame(() => {
      const at = document.activeElement;
      if ((!at || at === document.body) && request.opener?.isConnected) request.opener.focus();
    });
  };
  if (data.state !== "ready") return null;
  return (
    <ReadinessDialog
      purpose="videos"
      project={data.project}
      view={data.view}
      brief={data.brief}
      onPass={() => close(true)}
      onClose={() => close(false)}
    />
  );
}
