"use client";

// A commit point's ladder check, inline (Build and Earn P1-4). The call site
// asks `useCommitCheck(point, source)`; while it isn't met, the commit control
// reads aria-disabled and points at this notice (`describedBy`), which lists
// each missing step with its one-tap fix. Engineering never renders it.
//
// The one shared helper every commit point uses: mint (L2), list (L3),
// virtual editions (L3), physical editions and Request payout (L4). A step
// the call site already gates on its own screen goes in `handled`, so it is
// never asked twice there.

import * as React from "react";
import type { StoredDraft } from "@/lib/brief/project-brief";
import { commitCheck, EARN_LEVELS, type CommitPoint, type LadderStepId, type LevelCheck as Check } from "@/lib/commerce/ladder";
import type { ManualProject } from "@/lib/manual/projects";
import { cn } from "@/lib/utils";
import { MissingSteps } from "./missing-steps";
import { useEarnFacts, type EarnFactsSource } from "./use-earn-facts";

/** Until the wallet and identity stores hydrate, nothing is reported missing. */
export function useCommitCheck(point: CommitPoint, source: EarnFactsSource, opts?: { handled?: readonly LadderStepId[] }): Check {
  const { facts, ready } = useEarnFacts(source);
  const handled = opts?.handled;
  return React.useMemo(() => (ready ? commitCheck(point, facts, { handled }) : { ok: true }), [ready, point, facts, handled]);
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
  /** The commit, as a verb phrase: "list this project", "mint". */
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
  const level = EARN_LEVELS[check.level];
  const n = check.missing.length;
  return (
    <section id={id} aria-labelledby={headingId} className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-1">
        <h3 id={headingId} className="m-0 text-md font-semibold text-text-primary">
          {n === 1 ? `One step before you ${what}` : `${n} steps before you ${what}`}
        </h3>
        <p className="m-0 max-w-[62ch] text-sm leading-relaxed text-text-secondary">
          {`This needs level ${level.level}, ${level.name}.`}
        </p>
      </div>
      <MissingSteps steps={check.missing} project={project} brief={brief} announce={announce} onCover={onCover} />
    </section>
  );
}
