"use client";

// The business plan (P2-TABS-17…19), now Earn › Business plan: the title row
// (versions, Edit, Regenerate, Print or save as PDF), the sections with their
// sticky index, and Delete. It renders inside the Earn layout, which owns the
// page frame, the h1 and the owner-only gate, so the title here is an h2, and
// `empty` stands in while there is no plan to show (the section's Generate
// state). /projects/[id]/business-plan redirects here.

import * as React from "react";
import { LockIcon, PrinterIcon, Refresh01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, ConfirmDialog, Select } from "@/components/ideeza";
import type { ManualProject } from "@/lib/manual/projects";
import { formatDate } from "@/lib/manual/project-summary";
import { useGuards } from "@/lib/manual/use-write-guard";
import { useBusinessPlan } from "@/lib/manual/business-plan-store";
import { clearBusinessPlan, regeneratePlanRun, restorePlanVersion, retryPlanSection, useIsPlanLive } from "./plan-runner";
import { PlanSectionView } from "./plan-section";
import { PlanEditView } from "./plan-edit";
import { PlanVersionsMenu, RegenerateConfirm } from "./plan-versions";

/** Every control on the page is a 44 px target on a phone or a touch screen. */
const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
const RESTORE_MID_RUN = "Restore is available once the plan has finished writing.";

export function BusinessPlanPanel({
  project,
  empty,
  onDeleted,
}: {
  project: ManualProject;
  /** Shown while there is no plan, or no version of it, to show. */
  empty: React.ReactNode;
  /** After Delete: the plan is gone and `empty` is back; the caller places the focus. */
  onDeleted: () => void;
}) {
  const { record: plan } = useBusinessPlan(project.id);
  const live = useIsPlanLive(project.id);
  // Sold in full, the plan is read-only like the rest of the project: the
  // guards' lock, the one every engineering gate asks.
  const guards = useGuards();
  const lockReason = (guards.ready ? guards.lockOf(project)?.reason : null) ?? null;
  const locked = lockReason !== null;
  const lockId = React.useId();

  const [editing, setEditing] = React.useState(false);
  const [confirmingRegenerate, setConfirmingRegenerate] = React.useState(false);
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);

  const titleRef = React.useRef<HTMLHeadingElement | null>(null);

  const current = plan?.versions.find((v) => v.n === plan.current) ?? null;
  if (!plan || !current) return <>{empty}</>;

  const doneCount = current.sections.filter((s) => s.state === "done").length;
  const midRun = !!plan.run;

  const deletePlan = () => {
    clearBusinessPlan(project.id);
    setConfirmingDelete(false);
    onDeleted();
  };

  // View (the version on screen) and Restore both land on the page's title,
  // whose meta line names the version now shown.
  const toTitle = () => {
    titleRef.current?.scrollIntoView({ block: "start" });
    titleRef.current?.focus({ preventScroll: true });
  };

  return (
    <>
      <div>
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <h2 ref={titleRef} tabIndex={-1} className="m-0 text-xl font-bold leading-xl text-text-primary outline-none">
              Business plan
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              {project.name} · Version {current.n} · Generated {formatDate(current.createdAt)} · {doneCount} sections
            </p>
            {lockReason && (
              <p id={lockId} className="mt-3 flex max-w-[62ch] items-start gap-2 text-sm text-text-secondary">
                <span aria-hidden className="mt-[2px] inline-flex shrink-0 text-text-tertiary">
                  <Icon icon={LockIcon} size={14} />
                </span>
                {lockReason}
              </p>
            )}
          </div>
          {!editing && (
            <div className="flex flex-wrap items-center gap-3 print:hidden">
              <PlanVersionsMenu
                plan={plan}
                triggerClassName={TAP}
                restoreBlocked={lockReason ?? (midRun ? RESTORE_MID_RUN : null)}
                onView={toTitle}
                onRestore={(n) => {
                  restorePlanVersion(project.id, n);
                  toTitle();
                }}
              />
              <Button
                type="button"
                hierarchy="secondary"
                className={TAP}
                disabled={locked || midRun}
                aria-describedby={locked ? lockId : undefined}
                onClick={() => setEditing(true)}
              >
                Edit
              </Button>
              <Button
                type="button"
                hierarchy="secondary"
                className={TAP}
                disabled={locked || midRun || live}
                aria-describedby={locked ? lockId : undefined}
                iconLeading={<Icon icon={Refresh01Icon} size={16} />}
                onClick={() => setConfirmingRegenerate(true)}
              >
                Regenerate
              </Button>
              <Button
                type="button"
                hierarchy="primary"
                className={TAP}
                iconLeading={<Icon icon={PrinterIcon} size={16} />}
                onClick={() => window.print()}
              >
                Print or save as PDF
              </Button>
            </div>
          )}
        </div>

        {editing ? (
          <div className="mt-10">
            <PlanEditView
              projectId={project.id}
              versionN={current.n}
              sections={current.sections}
              planPrompt={current.prompt}
              saveBlocked={lockReason}
              onCancel={() => setEditing(false)}
              onSaved={() => setEditing(false)}
            />
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-10 [@container(min-width:1024px)]:grid-cols-[200px_minmax(0,1fr)]">
            <nav aria-label="Sections" className="hidden [@container(min-width:1024px)]:block print:hidden">
              <ol className="sticky top-10 flex flex-col gap-1 border-l border-solid border-border-subtle pl-4 text-sm">
                {current.sections.map((s) => (
                  <li key={s.id}>
                    <a href={`#section-${s.id}`} className="block truncate py-1 text-text-secondary hover:text-text-primary">
                      {s.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
            <div className="min-w-0">
              <div className="mb-8 [@container(min-width:1024px)]:hidden print:hidden">
                <Select
                  aria-label="Jump to section"
                  placeholder="Jump to section"
                  className="max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]"
                  options={current.sections.map((s) => ({ label: s.title, value: s.id }))}
                  onChange={(v) => document.getElementById(`section-${v}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                />
              </div>
              {current.sections.map((s) => (
                <PlanSectionView
                  key={s.id}
                  section={s}
                  headingId={`section-${s.id}`}
                  retry={
                    // Not beside a live run (the model takes one request at a time), and not once sold in full.
                    s.state === "failed" && !live && !locked ? (
                      <Button type="button" hierarchy="secondary" size="sm" className={TAP} onClick={() => retryPlanSection(project.id, s.id)}>
                        Try again
                      </Button>
                    ) : undefined
                  }
                />
              ))}
              <div className="mt-16 border-t border-solid border-border-subtle pt-8 print:hidden">
                <Button
                  type="button"
                  hierarchy="ghost"
                  className={`text-text-error ${TAP}`}
                  disabled={locked}
                  aria-describedby={locked ? lockId : undefined}
                  onClick={() => setConfirmingDelete(true)}
                >
                  Delete business plan…
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <RegenerateConfirm
        open={confirmingRegenerate}
        plan={plan}
        onConfirm={() => {
          setConfirmingRegenerate(false);
          regeneratePlanRun(project.id);
        }}
        onCancel={() => setConfirmingRegenerate(false)}
      />
      <ConfirmDialog open={confirmingDelete} title="Delete this business plan?" confirmLabel="Delete" onConfirm={deletePlan} onCancel={() => setConfirmingDelete(false)}>
        This deletes every version of this project&apos;s business plan. This can&apos;t be undone.
      </ConfirmDialog>
    </>
  );
}
