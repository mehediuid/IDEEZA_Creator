// save-footer.ts — COR-40's version arithmetic for the review footer's
// unsaved copy ("Save it as version {n} of {project}."): the version number
// the NEXT press of Save Project would give this build, worked out the same
// way attach() numbers a lineage (lib/manual/projects.tsx), so the footer's
// guess can't disagree with what Save actually writes.
import type { BuildJob } from "./history";
import type { BuildRef } from "../manual/project-read";

export function nextVersionOf(job: BuildJob, refs: BuildRef[]): number {
  const v = Math.max(0, ...refs.filter((r) => r.chatId === job.chatId).map((r) => r.version));
  return v + 1;
}
