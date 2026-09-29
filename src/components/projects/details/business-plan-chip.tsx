"use client";

// The business-plan header chip (P2-TABS-13): one entry, four states — read
// through `planChipState(plan, { live })`, the runner's own tab-local
// bookkeeping deciding None/Writing/Interrupted/Ready (errata #26).
//
// Owner only, right-aligned in the title row (§2.2). Writing a plan asks
// `can(viewer, "businessPlan.manage", view.canCtx)`, which a locked project
// (sold in full, decision 12) refuses: Generate and Continue writing go, but
// a plan that exists stays readable — the chip is "View business plan" then.
//
// `useIsProjectLocked` is for the plan page, which has no `view` of its own.

import * as React from "react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { IconButton, ProgressBar } from "@/components/ideeza";
import { cn } from "@/lib/utils";
import { can } from "@/lib/manual/permissions";
import type { ManualProject } from "@/lib/manual/projects";
import { useBusinessPlan } from "@/lib/manual/business-plan-store";
import { planChipState } from "@/lib/manual/business-plan";
import { useProjectEditGate } from "../use-edit-gate";
import type { SlotProps } from "./slots";
import { GenerateBusinessPlanDialog, WritingBusinessPlanDialog } from "../business-plan/plan-dialogs";
import { resumePlanRun, startPlanRun, stopPlanRun, useIsPlanLive } from "../business-plan/plan-runner";

/** The lock for a page without a `view` (the plan page). Any `ListingChange`
 *  does: the lock check in `editGateOf` fires before the listing table is
 *  even consulted. */
export function useIsProjectLocked(project: ManualProject | null | undefined): boolean {
  const { gateOf } = useProjectEditGate(project?.id ?? null);
  return gateOf("rename").kind === "locked";
}

function promptSeed(project: ManualProject, productNames: readonly string[]): string {
  const desc = project.description.trim();
  const names = productNames.filter(Boolean);
  if (!names.length) return desc;
  return desc ? `${desc}\n\nProducts: ${names.join(", ")}.` : `Products: ${names.join(", ")}.`;
}

export function BusinessPlanChip({ project, view, viewer }: SlotProps) {
  const { hydrated, record: plan } = useBusinessPlan(project.id);
  const live = useIsPlanLive(project.id);
  const [generateOpen, setGenerateOpen] = React.useState(false);
  const [writingOpen, setWritingOpen] = React.useState(false);

  if (!can(viewer, "facts.seeOwnerOnly", view.canCtx)) return null;
  if (!hydrated) return null;

  const state = planChipState(plan, { live });
  const writes = can(viewer, "businessPlan.manage", view.canCtx);

  const chipClass =
    "ml-auto inline-flex h-[28px] items-center gap-2 whitespace-nowrap rounded-full border border-solid border-border bg-bg-surface px-3 text-xs font-semibold text-text-secondary outline-none transition-colors hover:border-border-strong hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus max-md:min-h-[var(--touch-min)]";

  if (!writes) {
    return state === "none" ? null : (
      <a href={`/projects/${project.id}/business-plan`} className={chipClass}>
        View business plan
      </a>
    );
  }

  if (state === "none") {
    return (
      <>
        <button type="button" className={chipClass} onClick={() => setGenerateOpen(true)}>
          Generate business plan
        </button>
        <GenerateBusinessPlanDialog
          open={generateOpen}
          onClose={() => setGenerateOpen(false)}
          initialPrompt={promptSeed(project, view.products.map((p) => p.name))}
          onGenerate={(prompt) => {
            startPlanRun(project.id, prompt);
            setGenerateOpen(false);
            setWritingOpen(true);
          }}
        />
        <WritingBusinessPlanDialog open={writingOpen} onClose={() => setWritingOpen(false)} projectId={project.id} plan={plan} />
      </>
    );
  }

  if (state === "ready") {
    return (
      <a href={`/projects/${project.id}/business-plan`} className={chipClass}>
        View business plan
      </a>
    );
  }

  if (state === "interrupted") {
    const remaining = 8 - (plan?.run?.next ?? 8);
    return (
      <>
        <button
          type="button"
          className={chipClass}
          onClick={() => {
            resumePlanRun(project.id);
            setWritingOpen(true);
          }}
        >
          Continue writing ({remaining} left)
        </button>
        <WritingBusinessPlanDialog open={writingOpen} onClose={() => setWritingOpen(false)} projectId={project.id} plan={plan} />
      </>
    );
  }

  // "writing"
  const next = plan?.run?.next ?? 1;
  const pct = ((next - 1) / 7) * 100;
  return (
    <>
      <div className="ml-auto inline-flex items-center gap-1">
        <button
          type="button"
          className={cn(chipClass, "relative ml-0 overflow-hidden")}
          onClick={() => setWritingOpen(true)}
        >
          <span className="relative z-10">Writing business plan · {next} of 7</span>
          <span aria-hidden className="absolute inset-0">
            <ProgressBar value={pct} label="" className="h-full rounded-full opacity-20" />
          </span>
        </button>
        <IconButton
          icon={<Icon icon={Cancel01Icon} size={12} />}
          aria-label="Stop writing"
          hierarchy="ghost"
          size="sm"
          onClick={() => stopPlanRun(project.id)}
        />
      </div>
      <WritingBusinessPlanDialog open={writingOpen} onClose={() => setWritingOpen(false)} projectId={project.id} plan={plan} />
    </>
  );
}
