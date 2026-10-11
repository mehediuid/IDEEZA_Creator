"use client";

// "Request payout" (Build and Earn P1-4), a demo action at L4. It shows what
// this project's sales paid its seller, what's still to request, and the
// last request; the request itself stores one demo record and sends nothing.
// Below L4 the action reads aria-disabled and the ladder's missing steps sit
// right under it with their fixes (identity, as a rule).

import * as React from "react";
import { Button, TestnetDemoBadge } from "@/components/ideeza";
import type { StoredDraft } from "@/lib/brief/project-brief";
import { availableOf, earnedOf, payoutLinesText, requestedOf } from "@/lib/commerce/payout";
import { requestPayoutDemo, usePayoutRequests } from "@/lib/commerce/use-commerce";
import type { ProjectView } from "@/lib/manual/project-read";
import { formatShortDate } from "@/lib/manual/project-summary";
import type { ManualProject } from "@/lib/manual/projects";
import { cn } from "@/lib/utils";
import { LevelCheck, useCommitCheck } from "./level-check";
import { earnSourceOf } from "./use-earn-facts";

const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

export function RequestPayout({
  project,
  view,
  brief,
  now,
  announce,
}: {
  project: Pick<ManualProject, "id" | "createdAt" | "contributors" | "mint">;
  view: Pick<ProjectView, "products" | "videos" | "listing" | "sales">;
  brief: StoredDraft | null;
  now: number;
  announce?: (message: string) => void;
}) {
  const source = React.useMemo(() => earnSourceOf(project, view, brief), [project, view, brief]);
  const check = useCommitCheck("payout", source);
  const requests = usePayoutRequests();
  const [refused, setRefused] = React.useState(false);
  const headingId = React.useId();
  const whyId = React.useId();
  const checkId = React.useId();

  const earned = earnedOf(view.sales, project.id);
  const mine = (requests ?? []).filter((r) => r.projectId === project.id);
  const available = availableOf(earned, requestedOf(mine, project.id));
  const last = mine.length ? mine.reduce((a, b) => (b.at > a.at ? b : a)) : null;

  const why = !check.ok
    ? null
    : earned.length === 0
      ? "Nothing to pay out yet: this project has no sales."
      : available.length === 0
        ? "Everything earned so far has been requested."
        : null;
  const blocked = !check.ok || why !== null || requests === undefined;

  const request = () => {
    if (blocked) return;
    const req = requestPayoutDemo(project.id, available);
    if (!req) {
      setRefused(true);
      return;
    }
    setRefused(false);
    announce?.(`Payout of ${payoutLinesText(req.lines)} requested (demo).`);
  };

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-6 rounded-2xl border border-solid border-border bg-bg-surface p-8">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <h2 id={headingId} className="m-0 text-lg font-bold text-text-primary">
          Payouts
        </h2>
        <TestnetDemoBadge />
      </div>

      <dl className="m-0 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <dt className="text-sm font-medium text-text-secondary">Paid to you from sales</dt>
          <dd className="m-0 text-md font-semibold tabular-nums text-text-primary">{earned.length ? payoutLinesText(earned) : "Nothing yet"}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-sm font-medium text-text-secondary">Not yet requested</dt>
          <dd className="m-0 text-md font-semibold tabular-nums text-text-primary">{available.length ? payoutLinesText(available) : "Nothing"}</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          hierarchy="secondary"
          size="lg"
          aria-disabled={blocked || undefined}
          aria-describedby={!check.ok ? checkId : why ? whyId : undefined}
          className={cn("self-start max-sm:w-full aria-disabled:cursor-not-allowed aria-disabled:opacity-60", TAP)}
          onClick={request}
        >
          Request payout (demo)
        </Button>
        {why && (
          <p id={whyId} className="m-0 text-sm text-text-secondary">
            {why}
          </p>
        )}
        {refused && (
          <p role="alert" className="m-0 text-sm text-[color:var(--color-input-error-text)]">
            This browser couldn&apos;t save the request (storage is full or blocked). Nothing changed.
          </p>
        )}
      </div>

      <LevelCheck check={check} what="request a payout" id={checkId} project={project} brief={brief} announce={announce} />

      {last && (
        <p className="m-0 max-w-[62ch] text-sm leading-relaxed text-text-secondary">
          {`Last request: ${payoutLinesText(last.lines)} · ${formatShortDate(last.at, now)}. Demo: nothing is sent.`}
        </p>
      )}
    </section>
  );
}
