"use client";

// Generate a build's 3D enclosure from its concept image, once, and store the
// resulting .glb on the job — or record that it could not be made.
//
// It used to live inside the /build/<id> page alone, so a build reviewed where
// it now lives — inside its chat — never started a model at all, and the 3D tab
// said "Generating 3D model…" for as long as anyone cared to watch. A failed or
// never-finishing generation was not recorded either, which is the same
// endless spinner by another road. Both surfaces run this now, and the job
// carries the failure so the panel can say so and offer a retry.

import * as React from "react";
import { useCreateHistory, type BuildJob } from "@/lib/create/history";

// Jobs whose generation is in flight this session, so a second surface (or a
// remount) does not kick off a duplicate.
const modelStarted = new Set<string>();

/** Past this the provider is not going to answer, and the panel stops
 *  pretending it will. */
const MODEL_TIMEOUT_MS = 6 * 60_000;

export function useBuildModel(job: BuildJob | null) {
  const { setBuildModel, setBuildModelFailed } = useCreateHistory();
  const jobId = job?.id;
  const conceptImageUrl = job?.conceptImageUrl;
  const hasModel = Boolean(job?.modelGlbUrl);
  const failed = Boolean(job?.modelFailed);

  React.useEffect(() => {
    if (!jobId || !conceptImageUrl || hasModel || failed) return;
    if (modelStarted.has(jobId)) return;
    modelStarted.add(jobId);

    let alive = true;
    const deadline = Date.now() + MODEL_TIMEOUT_MS;
    const giveUp = () => {
      modelStarted.delete(jobId);
      if (alive) setBuildModelFailed(jobId, true);
    };
    (async () => {
      try {
        const res = await fetch("/api/three/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: conceptImageUrl }),
        });
        if (!res.ok) throw new Error("create failed");
        const { provider, taskId } = (await res.json()) as {
          provider: string;
          taskId: string;
        };
        const poll = async () => {
          if (!alive) return;
          if (Date.now() > deadline) return giveUp();
          try {
            const r = (await fetch(
              `/api/three/generate?provider=${provider}&taskId=${encodeURIComponent(taskId)}`,
            ).then((x) => x.json())) as { status: string; glbUrl?: string };
            if (!alive) return;
            if (r.status === "ready" && r.glbUrl) {
              setBuildModel(jobId, r.glbUrl);
              return;
            }
            if (r.status === "failed") return giveUp();
            setTimeout(poll, 2500);
          } catch {
            if (alive) setTimeout(poll, 3500);
          }
        };
        setTimeout(poll, 1500);
      } catch {
        giveUp();
      }
    })();

    return () => {
      alive = false;
      // A surface that goes away mid-generation hands the job back, so the
      // next one to mount picks it up rather than finding it "started".
      modelStarted.delete(jobId);
    };
  }, [jobId, conceptImageUrl, hasModel, failed, setBuildModel, setBuildModelFailed]);
}
