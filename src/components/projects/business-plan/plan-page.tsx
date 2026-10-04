"use client";

// /projects/[id]/business-plan (P2-TABS-17…19): a thin server page
// (src/app/(create)/projects/[id]/business-plan/page.tsx) renders this.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LockIcon, Note01Icon, PrinterIcon, Refresh01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, ConfirmDialog, Select, StateCard, buttonVariants } from "@/components/ideeza";
import { Breadcrumb } from "../details/breadcrumb";
import { PAGE_CONTAINER, PAGE_CONTENT } from "../details/frame";
import { ProjectSkeleton } from "../details/page-states";
import { useViewer } from "../details/buyer-preview";
import { projectLockOf } from "@/lib/manual/edit-gate";
import { useManualProjects } from "@/lib/manual/projects";
import { useMarket } from "@/lib/market/market-store";
import { resolveProject } from "@/lib/manual/project-route";
import { formatDate } from "@/lib/manual/project-summary";
import { useBusinessPlan } from "@/lib/manual/business-plan-store";
import { clearBusinessPlan, regeneratePlanRun, restorePlanVersion, retryPlanSection, useIsPlanLive } from "./plan-runner";
import { PlanSectionView } from "./plan-section";
import { PlanEditView } from "./plan-edit";
import { PlanVersionsMenu, RegenerateConfirm } from "./plan-versions";

/** Every control on the page is a 44 px target on a phone or a touch screen. */
const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
const RESTORE_MID_RUN = "Restore is available once the plan has finished writing.";

export function BusinessPlanPage({ id }: { id: string }) {
  const router = useRouter();
  const { hydrated, projects } = useManualProjects();
  const project = resolveProject(projects, id);
  const viewer = useViewer();
  const { hydrated: planHydrated, record: plan } = useBusinessPlan(project?.id ?? null);
  const live = useIsPlanLive(project?.id ?? null);
  // Sold in full, the plan is read-only like the rest of the project. The
  // lock reads the market's sales, so the page waits for that store as well.
  const { hydrated: marketHydrated, data: market } = useMarket();
  const lockReason = project ? (projectLockOf(project, market.sales)?.line ?? null) : null;
  const locked = lockReason !== null;
  const lockId = React.useId();

  const [editing, setEditing] = React.useState(false);
  const [confirmingRegenerate, setConfirmingRegenerate] = React.useState(false);
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);

  const titleRef = React.useRef<HTMLHeadingElement | null>(null);
  React.useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, [project?.id]);

  if (!hydrated || !planHydrated || !marketHydrated) return <ProjectSkeleton />;
  if (!project) {
    return (
      <div className={PAGE_CONTAINER}>
        <div className="flex justify-center px-8 py-40">
          <StateCard tone="empty" icon={<Icon icon={Note01Icon} size={32} />} title="We couldn't find this project" body={`Nothing in this browser matches ${id}.`} />
        </div>
      </div>
    );
  }

  const isOwner = viewer.kind === "local-owner";
  const current = plan?.versions.find((v) => v.n === plan.current) ?? null;

  if (!isOwner || !plan || !current) {
    return (
      <div className={PAGE_CONTAINER}>
        <div className={PAGE_CONTENT}>
          <Breadcrumb
            trail={[
              { label: "My projects", href: "/projects" },
              { label: project.name, href: `/projects/${project.id}` },
              { label: "Business plan" },
            ]}
          />
          <div className="mt-16 flex justify-center">
            <StateCard
              tone="empty"
              icon={<Icon icon={Note01Icon} size={32} />}
              title="No business plan yet"
              body={`There's no business plan for ${project.name} yet.`}
              action={
                <Link href={`/projects/${project.id}`} className={buttonVariants({ hierarchy: "primary" })}>
                  Back to {project.name}
                </Link>
              }
            />
          </div>
        </div>
      </div>
    );
  }

  const doneCount = current.sections.filter((s) => s.state === "done").length;
  const midRun = !!plan.run;

  const deletePlan = () => {
    clearBusinessPlan(project.id);
    setConfirmingDelete(false);
    router.push(`/projects/${project.id}`);
  };

  // View (the version on screen) and Restore both land on the page's title,
  // whose meta line names the version now shown.
  const toTitle = () => {
    titleRef.current?.scrollIntoView({ block: "start" });
    titleRef.current?.focus({ preventScroll: true });
  };

  return (
    <div className={PAGE_CONTAINER}>
      <div className={PAGE_CONTENT}>
        <Breadcrumb
          trail={[
            { label: "My projects", href: "/projects" },
            { label: project.name, href: `/projects/${project.id}` },
            { label: "Business plan" },
          ]}
        />

        <div className="mt-10 flex flex-wrap items-start justify-between gap-6">
          <div>
            <h1 ref={titleRef} tabIndex={-1} className="text-3xl font-semibold text-text-primary outline-none">
              Business plan
            </h1>
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
    </div>
  );
}
