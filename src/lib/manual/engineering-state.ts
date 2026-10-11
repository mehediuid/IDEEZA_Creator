// The engineering axis (Build and Earn P1-1): what a project is as a build,
// whatever has been sold. Its twin is `commercialStateOf` (lib/commerce/state.ts);
// `projectStatus` (project-summary.ts) is the commercial one in My projects'
// words, so nothing here moves it.
//
// Pure; relative imports, so node:test loads the compiled module.

import type { BuildJob } from "../create/history";
import type { ManualProject } from "./projects";
import { buildsOf, pendingVersionsOf } from "./project-read";

/**
 * - empty: no build stands behind it (made by hand);
 * - building: a newer version of one of its chats is queued or building;
 * - built: otherwise.
 */
export type EngineeringStage = "empty" | "building" | "built";

export type EngineeringState = {
  state: EngineeringStage;
  /** The newest version the project holds, over its lineages; 0 when no build stands behind it. */
  version: number;
  /** A newer build of one of its chats isn't in the project yet: building, ready to save, or
   *  waiting for a retry (the pending-version notices). */
  headAhead: boolean;
};

/** `builds`: every build in this browser; `projects`: the live list, so a build saved into a
 *  deleted project reads as pending (`pendingVersionsOf`). */
export function engineeringStateOf(
  p: ManualProject,
  ctx: { builds: BuildJob[]; projects?: ManualProject[] },
): EngineeringState {
  const refs = buildsOf(p, ctx.builds);
  const waiting = pendingVersionsOf(refs, ctx.builds, ctx.projects);
  // The summary's own pick (`pendingVersion`): a version ready to save first, else the first one.
  const pick = waiting.find((w) => w.status === "ready") ?? waiting[0];
  const building = pick?.status === "running" || pick?.status === "queued";
  return {
    state: building ? "building" : refs.length ? "built" : "empty",
    version: Math.max(0, ...refs.map((r) => r.version)),
    headAhead: waiting.length > 0,
  };
}
