"use client";

// Earn › Business plan on the phone (Figma 16–16o; the web's earn/plan.tsx
// and business-plan/*, its runner, store and words), its own screen under
// the top bar "‹ Business plan". One state at a time, read as the web reads
// it (`planChipState`, with this screen's live run), each with its one action
// at the foot:
// · none (16) — the kit's empty state ("No plan yet" and the web's line);
//   Generate business plan opens the Generate sheet (16b), then the Writing
//   sheet (16c) as the run starts;
// · writing (16g) — the run's row (its line and bar; a tap is Show progress)
//   over the plan whose sections fill in as each lands; Stop writing;
// · interrupted (16h) — the run's line; Continue writing (picks it up where
//   it stopped) and Start over (the Generate sheet again; the unfinished
//   version is dropped before the new run);
// · failed (16i) — nothing was written: "We couldn't write the plan" and Try
//   again, which runs the same description again;
// · ready (16d) — the plan (plan/plan-doc.tsx), Print or save as PDF.
// The runner lives at the app's root, so a run carries on whichever screen is
// open. When the run finishes while the Writing sheet is up, the Ready sheet
// (16f) takes its place. Writing asks `can(viewer, "businessPlan.manage",
// view.canCtx)`, which a project sold in full refuses (16o): a plan stays
// readable, and there is nothing to start.

import * as React from "react";
import { Note01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ideeza/button";
import { ProgressBar } from "@/components/ideeza/progress-bar";
import { Skeleton } from "@/components/ideeza/skeleton";
import { startPlanRun, stopPlanRun, useIsPlanLive } from "@/components/projects/business-plan/plan-runner";
import { useBusinessPlan, writeBusinessPlan } from "@/lib/manual/business-plan-store";
import { can } from "@/lib/manual/permissions";
import { currentVersionOf, phonePlanState, planPromptSeed, runLineOf, runProgressOf, withoutVersion } from "@/lib/manual/phone-plan-money";
import { useGuards } from "@/lib/manual/use-write-guard";
import { cn } from "@/lib/utils";
import { Chevron, LIST_CARD } from "../kit/list";
import { EmptyState, ErrorState } from "../kit/state";
import { useEarn } from "./context";
import { EarnBar } from "./parts";
import { PlanDoc } from "./plan/plan-doc";
import { GenerateSheet, ReadySheet, WritingSheet, finishPlan } from "./plan/plan-sheets";
import { T } from "../type";

export function EarnPlanTab() {
  const { project, view, viewer, announce } = useEarn();
  const { hydrated, record: plan } = useBusinessPlan(project.id);
  const live = useIsPlanLive(project.id);
  const state = phonePlanState(plan, live);
  const writes = can(viewer, "businessPlan.manage", view.canCtx);
  const guards = useGuards();
  const lockReason = (guards.ready ? guards.lockOf(project)?.reason : null) ?? null;
  const current = currentVersionOf(plan);

  /** The Generate sheet's prefill, and the unfinished version to clear before the run starts (Start over). */
  const [generate, setGenerate] = React.useState<{ seed: string; drop: number | null } | null>(null);
  const [writingOpen, setWritingOpen] = React.useState(false);
  const [readyN, setReadyN] = React.useState<number | null>(null);
  const [stopAsked, setStopAsked] = React.useState(false);
  const emptyRef = React.useRef<HTMLDivElement>(null);
  const titleRef = React.useRef<HTMLDivElement>(null);

  // The run ending on this screen: the Writing sheet steps aside, and when the
  // run finished (not stopped) the Ready sheet shows what was written.
  const [wasLive, setWasLive] = React.useState(live);
  if (wasLive !== live) {
    setWasLive(live);
    if (wasLive && !live) {
      const finished = !stopAsked && !plan?.run && !!current && current.sections.some((s) => s.state === "done");
      if (writingOpen && finished) setReadyN(current.n);
      setWritingOpen(false);
      setStopAsked(false);
    }
  }
  const readyVersion = readyN !== null ? (plan?.versions.find((v) => v.n === readyN) ?? null) : null;

  const seed = planPromptSeed(project.description, view.products.map((p) => p.name));
  const start = (prompt: string, drop: number | null) => {
    if (drop !== null && plan) writeBusinessPlan(project.id, withoutVersion(plan, drop));
    startPlanRun(project.id, prompt);
    setGenerate(null);
    setWritingOpen(true);
    announce("Writing your business plan");
  };
  const stop = () => {
    setStopAsked(true);
    stopPlanRun(project.id);
    announce("Writing stopped");
  };
  const toTitle = () =>
    requestAnimationFrame(() => {
      titleRef.current?.scrollIntoView({ block: "start" });
      titleRef.current?.focus({ preventScroll: true });
    });

  if (!hydrated) {
    return (
      <div role="status" aria-label="Loading the business plan" className="flex flex-col gap-8">
        <Skeleton shape="block" className="h-[64px] w-full" />
        <Skeleton shape="block" className="h-[240px] w-full" />
      </div>
    );
  }

  const doc = (state === "ready" || state === "writing" || state === "interrupted") && plan && current ? { plan, current } : null;
  const running = writes && !!plan?.run && (state === "writing" || state === "interrupted");
  const runLine = plan?.run ? runLineOf(plan.run, live, plan.versions.find((v) => v.n === plan.run?.version)) : "";

  return (
    <div className="flex flex-col gap-8">
      {!doc && (
        <div ref={emptyRef} tabIndex={-1} className="outline-none">
          {writes && state === "failed" && current ? (
            <ErrorState title="We couldn't write the plan" body="Something went wrong on our side. Nothing was charged." />
          ) : writes ? (
            <EmptyState icon={Note01Icon} title="No plan yet" body="Describe the product, and AI writes a seven-section plan you can edit and print." />
          ) : (
            <EmptyState icon={Note01Icon} title={`There's no business plan for ${project.name}.`} />
          )}
        </div>
      )}

      {running && plan?.run && (
        <div className={LIST_CARD}>
          {state === "writing" ? (
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => setWritingOpen(true)}
              className="flex w-full items-center gap-6 px-8 py-6 text-left outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus active:bg-bg-subtle"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-4">
                <span className={T.rowTitle}>{runLine}</span>
                <ProgressBar value={runProgressOf(plan.run)} label={runLineOf(plan.run, live)} />
                <span className={T.meta}>Show progress</span>
              </span>
              <Chevron />
            </button>
          ) : (
            <p className={cn(T.rowTitle, "px-8 py-6")}>{runLine}</p>
          )}
        </div>
      )}

      {doc && (
        <PlanDoc
          plan={doc.plan}
          current={doc.current}
          live={live}
          lockReason={lockReason}
          writes={writes}
          printInBar={!running}
          titleRef={titleRef}
          onDeleted={() => {
            announce("Business plan deleted");
            requestAnimationFrame(() => emptyRef.current?.focus());
          }}
        />
      )}

      {writes && !doc && state === "failed" && current && (
        <EarnBar>
          <Button size="xl" className="w-full" onClick={() => start(current.prompt, current.n)}>
            Try again
          </Button>
        </EarnBar>
      )}
      {writes && !doc && state !== "failed" && (
        <EarnBar>
          <Button size="xl" className="w-full" onClick={() => setGenerate({ seed, drop: null })}>
            Generate business plan
          </Button>
        </EarnBar>
      )}
      {running && plan?.run && (
        <EarnBar>
          {state === "writing" ? (
            <Button hierarchy="secondary" size="xl" className="w-full" onClick={stop}>
              Stop writing
            </Button>
          ) : (
            <>
              <Button
                size="xl"
                className="w-full"
                onClick={() => {
                  // Every section the version still lacks, not only the ones the run had queued.
                  finishPlan(project.id, plan.run?.version);
                  setWritingOpen(true);
                }}
              >
                Continue writing
              </Button>
              <Button
                hierarchy="secondary"
                size="xl"
                className="w-full"
                onClick={() => {
                  const version = plan.run?.version ?? null;
                  setGenerate({ seed: plan.versions.find((v) => v.n === version)?.prompt ?? seed, drop: version });
                }}
              >
                Start over
              </Button>
            </>
          )}
        </EarnBar>
      )}

      {writes && (
        <>
          <GenerateSheet
            open={generate !== null}
            initialPrompt={generate?.seed ?? seed}
            onClose={() => setGenerate(null)}
            onGenerate={(prompt) => start(prompt, generate?.drop ?? null)}
          />
          <WritingSheet open={writingOpen} onClose={() => setWritingOpen(false)} onStop={stop} projectId={project.id} plan={plan} />
          <ReadySheet
            projectId={project.id}
            version={readyVersion}
            onClose={() => setReadyN(null)}
            onOpen={() => {
              setReadyN(null);
              toTitle();
            }}
            onDiscarded={() => {
              setReadyN(null);
              announce("Business plan discarded");
              requestAnimationFrame(() => emptyRef.current?.focus());
            }}
            onFinish={() => {
              const n = readyN;
              setReadyN(null);
              if (n !== null && finishPlan(project.id, n)) {
                setWritingOpen(true);
                announce("Writing the missing sections");
              }
            }}
          />
        </>
      )}
    </div>
  );
}
