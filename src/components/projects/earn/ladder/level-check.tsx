"use client";

// A commit point's ladder check, inline (Build and Earn P1-4). The call site
// asks `useCommitCheck(point, source)`; while it isn't met, the commit control
// reads aria-disabled and points at this notice (`describedBy`), or is left
// out (Earn's Overview and "Your project"), and the notice, "Before you can
// {what}", lists each missing step with its one-tap fix. Engineering never
// renders it.
//
// The one shared helper every commit point uses: mint (L2), list (L3),
// virtual editions (L3), physical editions and Request payout (L4). A step
// the call site already gates on its own screen goes in `handled`, so it is
// never asked twice there.

import * as React from "react";
import type { StoredDraft } from "@/lib/brief/project-brief";
import { commitCheck, type CommitPoint, type LadderStepId, type LevelCheck as Check } from "@/lib/commerce/ladder";
import type { ManualProject } from "@/lib/manual/projects";
import { cn } from "@/lib/utils";
import { EARN_H3 } from "../surface";
import { MissingSteps } from "./missing-steps";
import { useEarnFacts, type EarnFactsSource } from "./use-earn-facts";

/** The check and whether it has run: until the wallet and identity stores hydrate, nothing is
 *  reported missing and `ready` is false, so a surface that opens on arrival waits for it. */
export function useCommitGate(
  point: CommitPoint,
  source: EarnFactsSource,
  opts?: { handled?: readonly LadderStepId[] },
): { check: Check; ready: boolean } {
  const { facts, ready } = useEarnFacts(source);
  const handled = opts?.handled;
  return React.useMemo(
    () => ({ check: ready ? commitCheck(point, facts, { handled }) : { ok: true }, ready }),
    [ready, point, facts, handled],
  );
}

/** Until the wallet and identity stores hydrate, nothing is reported missing. */
export function useCommitCheck(point: CommitPoint, source: EarnFactsSource, opts?: { handled?: readonly LadderStepId[] }): Check {
  return useCommitGate(point, source, opts).check;
}

export function LevelCheck({
  check,
  what,
  id,
  project,
  brief,
  announce,
  onCover,
  className,
}: {
  check: Check;
  /** The commit, as a verb phrase finishing "Before you can …": "list", "mint". */
  what: string;
  /** The notice's id, for the commit control's aria-describedby. */
  id?: string;
  project: Pick<ManualProject, "id">;
  brief: StoredDraft | null;
  announce?: (message: string) => void;
  /** Inside a dialog: true while a fix's own dialog is on top of it. */
  onCover?: (covered: boolean) => void;
  className?: string;
}) {
  const headingId = React.useId();
  if (check.ok) return null;
  return (
    <section id={id} aria-labelledby={headingId} className={cn("flex flex-col gap-4", className)}>
      <h3 id={headingId} className={EARN_H3}>
        {`Before you can ${what}`}
      </h3>
      <MissingSteps steps={check.missing} project={project} brief={brief} announce={announce} onCover={onCover} />
    </section>
  );
}
