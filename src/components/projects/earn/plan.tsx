"use client";

// Earn › Business plan: the business-plan page's content (plan-page.tsx's
// BusinessPlanPanel), and the start of a plan, which the project header's
// Business plan chip used to hold (P2-TABS-13…15). One state at a time, read
// through `planChipState(plan, { live })` as the chip read it:
// - None: "No business plan yet" with Generate business plan, which opens
//   the Generate dialog, then the Writing dialog once the run starts;
// - Writing: a progress row (Show progress opens the Writing dialog, Stop
//   writing ends the run and keeps what finished) over the plan, its
//   sections filling in as each lands;
// - Interrupted: the run stopped in another tab or a reload; Continue
//   writing picks it up where it stopped;
// - Ready: the plan.
// Writing a plan asks `can(viewer, "businessPlan.manage", view.canCtx)`,
// which a project sold in full refuses: a plan that exists stays readable,
// and there is nothing to start. Its heading, cards and rhythm are the other
// tabs' (surface.tsx); with no plan it is one line and one action.

import * as React from "react";
import { Button, ProgressBar } from "@/components/ideeza";
import { planChipState, PLAN_SECTIONS } from "@/lib/manual/business-plan";
import { useBusinessPlan } from "@/lib/manual/business-plan-store";
import { can } from "@/lib/manual/permissions";
import type { ManualProject } from "@/lib/manual/projects";
import { cn } from "@/lib/utils";
import { GenerateBusinessPlanDialog, WritingBusinessPlanDialog } from "../business-plan/plan-dialogs";
import { BusinessPlanPanel } from "../business-plan/plan-page";
import { resumePlanRun, startPlanRun, stopPlanRun, useIsPlanLive } from "../business-plan/plan-runner";
import type { SlotProps } from "../details/slots";
import { EARN_CARD, EARN_STACK, EarnBlock, TAP } from "./surface";

const TOTAL = PLAN_SECTIONS.length;

/** The Generate dialog's prefill (P2-TABS-14): the project description, then its product names. */
function promptSeed(project: ManualProject, productNames: readonly string[]): string {
  const desc = project.description.trim();
  const names = productNames.filter(Boolean);
  if (!names.length) return desc;
  return desc ? `${desc}\n\nProducts: ${names.join(", ")}.` : `Products: ${names.join(", ")}.`;
}

export function EarnPlan({ project, view, viewer, announce }: SlotProps) {
  const { record: plan } = useBusinessPlan(project.id);
  const live = useIsPlanLive(project.id);
  const state = planChipState(plan, { live });
  const writes = can(viewer, "businessPlan.manage", view.canCtx);
  const [generateOpen, setGenerateOpen] = React.useState(false);
  const [writingOpen, setWritingOpen] = React.useState(false);
  const emptyRef = React.useRef<HTMLDivElement | null>(null);

  const empty = (
    <div ref={emptyRef} tabIndex={-1} className="rounded-2xl outline-none">
      <EarnBlock
        title="Business plan"
        lead={
          writes
            ? "No plan yet. Describe the product, and AI writes a seven-section plan you can edit and print."
            : `There's no business plan for ${project.name}.`
        }
      >
        {writes && (
          <Button type="button" hierarchy="primary" size="lg" className={cn("self-start max-sm:w-full", TAP)} onClick={() => setGenerateOpen(true)}>
            Generate business plan
          </Button>
        )}
      </EarnBlock>
    </div>
  );

  return (
    <div data-tour="earn-plan-doc" className={EARN_STACK}>
      {writes && state === "writing" && plan?.run && (
        <RunRow
          text={`Writing business plan · ${plan.run.next} of ${TOTAL}`}
          progress={((plan.run.next - 1) / TOTAL) * 100}
          actions={
            <>
              <Button type="button" hierarchy="secondary" className={TAP} onClick={() => setWritingOpen(true)}>
                Show progress
              </Button>
              <Button type="button" hierarchy="ghost" className={TAP} onClick={() => stopPlanRun(project.id)}>
                Stop writing
              </Button>
            </>
          }
        />
      )}
      {writes && state === "interrupted" && plan?.run && (
        <RunRow
          text={`Writing stopped with ${TOTAL + 1 - plan.run.next} of ${TOTAL} sections left.`}
          actions={
            <Button
              type="button"
              hierarchy="secondary"
              className={TAP}
              onClick={() => {
                resumePlanRun(project.id);
                setWritingOpen(true);
              }}
            >
              Continue writing
            </Button>
          }
        />
      )}

      <BusinessPlanPanel
        project={project}
        empty={empty}
        onDeleted={() => {
          announce("Business plan deleted");
          requestAnimationFrame(() => emptyRef.current?.focus());
        }}
      />

      {writes && (
        <>
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
      )}
    </div>
  );
}

/** A run's state over the plan: what is happening, how far it has got, and what can be done about it. */
function RunRow({ text, progress, actions }: { text: string; progress?: number; actions: React.ReactNode }) {
  return (
    <div className={cn(EARN_CARD, "gap-4 print:hidden [@container(min-width:640px)]:flex-row [@container(min-width:640px)]:items-center [@container(min-width:640px)]:justify-between")}>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <p className="m-0 text-md font-semibold text-text-primary">{text}</p>
        {progress !== undefined && <ProgressBar value={progress} label={text} className="max-w-[360px]" />}
      </div>
      <div className="flex flex-wrap items-center gap-4">{actions}</div>
    </div>
  );
}
