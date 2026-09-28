"use client";

// The rail's Editor block (COR-59…61, COR-65). Six rows — PCB Design · Code ·
// 3D Module · Assembly · Peripheral Wiring · Product Preview — each a link to
// its editor step with the one fact the project's own documents support, and
// never a status word: the old "Done / Not started" read `flowState`, which
// nothing but the Brief's mint ever writes (owner decision O4). The Brief is
// not a row; its door is the header.
//
// The facts are read once per visit, in an idle callback after the first
// paint, so arriving on a project never parses its PCB doc before the page
// has drawn; until then each row reads "—". Owner only: a buyer's preview
// has no Editor block at all (PPL-6).

import * as React from "react";
import NextLink from "next/link";
import { ArrowRight01Icon, Refresh01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { EDITOR_GLOBAL_NOTE, editorWorkOf, type EditorWork } from "@/lib/manual/editor-work";
import { can } from "@/lib/manual/permissions";
import {
  FLOW_STEPS,
  STEP_LABELS,
  stepHref,
  useManualProjects,
  type ManualProject,
  type ProjectStep,
} from "@/lib/manual/projects";
import { stepFactText } from "@/lib/manual/rail-rows";
import { cn } from "@/lib/utils";
import { RailBlock, useRailStacked } from "./rail-block";
import type { SlotProps } from "./slots";

type EditorStep = Exclude<ProjectStep, "brief">;

/** The editor's own order (UIUX-80), without the Brief. */
const STEPS = FLOW_STEPS.filter((s): s is EditorStep => s !== "brief");

export function RailEditor({ project, viewer }: SlotProps) {
  if (!can(viewer, "project.openEditor")) return null;
  return (
    <RailBlock title="Editor">
      <EditorRows project={project} />
      <p className="m-0 max-w-[62ch] text-sm leading-sm text-text-secondary">{EDITOR_GLOBAL_NOTE}</p>
    </RailBlock>
  );
}

/** COR-61: one read per visit, after first paint, when the browser is idle.
 *  `undefined` until it has run. The reader never writes. */
function useEditorWork(projectId: string): EditorWork | undefined {
  const [read, setRead] = React.useState<{ id: string; work: EditorWork } | null>(null);
  React.useEffect(() => {
    const run = () => setRead({ id: projectId, work: editorWorkOf(projectId) });
    if (typeof window.requestIdleCallback === "function") {
      const handle = window.requestIdleCallback(run, { timeout: 2000 });
      return () => window.cancelIdleCallback(handle);
    }
    // No requestIdleCallback (Safari): a macrotask still lands after paint.
    const timer = window.setTimeout(run, 1);
    return () => window.clearTimeout(timer);
  }, [projectId]);
  return read?.id === projectId ? read.work : undefined;
}

function EditorRows({ project }: { project: ManualProject }) {
  const { selectProject } = useManualProjects();
  const work = useEditorWork(project.id);
  const stacked = useRailStacked();
  // LeaveButton's press state (review-outputs.tsx): the pressed row says
  // "Opening…" and every row is shut until the editor takes over — two
  // navigations at once is not a thing the maker can have meant.
  const [leaving, setLeaving] = React.useState<EditorStep | null>(null);

  return (
    <ul role="list" className="-mx-3 flex flex-col">
      {STEPS.map((step) => {
        const busy = leaving === step;
        const blocked = leaving !== null && !busy;
        const fact = busy ? "Opening…" : stepFactText(work?.[step]);
        return (
          <li key={step}>
            <NextLink
              href={stepHref(project, step)}
              aria-busy={busy || undefined}
              aria-disabled={blocked || undefined}
              onClick={(e) => {
                // Shut while any row is already leaving, the pressed one too.
                if (leaving !== null) e.preventDefault();
              }}
              onNavigate={() => {
                // Only an in-app navigation presses the row: a Cmd/Ctrl-click
                // opens a tab and leaves this page as it was.
                selectProject(project.id);
                setLeaving(step);
              }}
              className={cn(
                "group flex min-h-16 items-start gap-4 rounded-md px-3 py-3 outline-none transition-colors duration-normal ease-decelerate hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus [@media(pointer:coarse)]:min-h-[var(--touch-min)]",
                stacked && "min-h-[var(--touch-min)] items-center",
                busy && "cursor-wait",
                blocked && "cursor-not-allowed opacity-60",
              )}
            >
              <span className="shrink-0 text-md font-medium leading-md text-text-primary">
                {STEP_LABELS[step]}
              </span>
              <span
                className={cn(
                  "min-w-0 flex-1 text-right text-sm leading-md tabular-nums",
                  busy ? "text-text-primary" : "text-text-secondary",
                )}
              >
                {fact}
              </span>
              <span
                aria-hidden
                className={cn(
                  "inline-flex h-[var(--line-height-md)] shrink-0 items-center text-text-tertiary transition-colors duration-normal ease-decelerate group-hover:text-text-primary",
                  busy && "motion-safe:animate-spin",
                )}
              >
                <Icon icon={busy ? Refresh01Icon : ArrowRight01Icon} size={16} />
              </span>
            </NextLink>
          </li>
        );
      })}
    </ul>
  );
}
