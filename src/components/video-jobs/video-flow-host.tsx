"use client";

// The host for `openVideoFlow` (video-flow.ts), mounted once at the app's root beside the Project
// video dialog's host: a product request opens its Generate video dialog, a project one hands over
// to `openProjectVideoDialog`.

import * as React from "react";
import { useCreateHistory } from "@/lib/create/history";
import { buildsOf, productsOfProject } from "@/lib/manual/project-read";
import { useManualProjects } from "@/lib/manual/projects";
import { PROJECT_VIDEO_KEY } from "@/lib/video/types";
import { GenerateVideoDialog, videoTargetOf } from "./generate-video-dialog";
import { openProjectVideoDialog } from "./project-video-dialog";
import { publishVideoFlow, subscribeVideoFlow, videoFlowNow, type VideoFlowRequest } from "./video-flow";

export function VideoFlowHost() {
  const request = React.useSyncExternalStore(subscribeVideoFlow, videoFlowNow, () => null);
  React.useEffect(() => {
    if (request?.productId !== PROJECT_VIDEO_KEY) return;
    publishVideoFlow(null);
    openProjectVideoDialog(request.projectId);
  }, [request]);
  if (!request || request.productId === PROJECT_VIDEO_KEY) return null;
  return <Hosted key={request.n} request={request} />;
}

function Hosted({ request }: { request: VideoFlowRequest }) {
  const { projects } = useManualProjects();
  const { builds } = useCreateHistory();
  const project = projects.find((p) => p.id === request.projectId);
  const product = React.useMemo(
    () => (project ? productsOfProject(project, buildsOf(project, builds)).find((p) => p.id === request.productId) : undefined),
    [project, builds, request.productId],
  );
  if (!project || !product) return null;
  return (
    <GenerateVideoDialog
      open
      target={videoTargetOf(project, product)}
      reviewTakeId={request.review}
      fromTakeId={request.from}
      onClose={() => publishVideoFlow(null)}
    />
  );
}
