"use client";

// ProjectsList — /projects (My projects) page content. Lists every
// manual project the user owns; clicking a row sets it as the active
// project and routes to the first incomplete editor step so the user
// resumes where they left off.
//
// Empty state mirrors the History page's empty state so the two
// surfaces read as a cohesive "everything I've made" pair.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft01Icon,
  CheckmarkBadge01Icon,
  CpuIcon,
  File01Icon,
  PencilEdit01Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import {
  stepHref,
  STEP_LABELS,
  completedCount,
  firstIncompleteStep,
  useManualProjects,
  type ManualProject,
} from "@/lib/manual/projects";

export function ProjectsList() {
  const router = useRouter();
  const { hydrated, projects, selectProject } = useManualProjects();

  const handleOpen = (project: ManualProject) => {
    selectProject(project.id);
    router.push(stepHref(project, firstIncompleteStep(project)));
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-[16px] border-b border-border bg-bg-page px-[24px] py-[12px]">
        <Link
          href="/"
          aria-label="Back to Home"
          className="inline-flex h-[36px] w-[36px] items-center justify-center rounded-lg text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-surface-raised hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <Icon icon={ArrowLeft01Icon} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-2xs font-bold uppercase tracking-wider text-text-tertiary">
            Workspace
          </p>
          <h1 className="truncate text-md font-semibold text-text-primary">
            My projects
          </h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1200px] px-[24px] py-[32px]">
          {!hydrated ? (
            <p className="text-md text-text-tertiary">Loading…</p>
          ) : projects.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <p className="text-sm text-text-tertiary">
                Every project you&apos;ve created through Build manually. Open
                one to keep designing across PCB, Code, 3D, Preview, and
                Brief.
              </p>
              <ul role="list" className="mt-[20px] flex flex-col gap-[8px]">
                {projects.map((project) => (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    onOpen={() => handleOpen(project)}
                  />
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── row ─────────────────────────────

function ProjectRow({
  project,
  onOpen,
}: {
  project: ManualProject;
  onOpen: () => void;
}) {
  const done = completedCount(project);
  const total = 5;
  const next = firstIncompleteStep(project);
  const lastTouch = formatTime(project.updatedAt);

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${project.name}, ${done} of ${total} steps complete`}
        className="flex w-full items-stretch gap-[16px] rounded-xl border border-border bg-bg-surface p-[16px] text-left outline-none transition-colors duration-fast hover:border-border-strong focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <span
          aria-hidden
          className="inline-flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-lg bg-bg-brand-subtle text-text-brand"
        >
          <Icon
            icon={project.status === "completed" ? CheckmarkBadge01Icon : CpuIcon}
            size={20}
          />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-[8px]">
          <div className="flex items-start justify-between gap-[12px]">
            <div className="min-w-0">
              <p className="truncate text-md font-semibold text-text-primary">
                {project.name}
              </p>
              {project.description && (
                <p className="mt-[2px] line-clamp-1 text-sm text-text-tertiary">
                  {project.description}
                </p>
              )}
            </div>
            <StatusBadge status={project.status} />
          </div>

          {/* Progress + meta line */}
          <div className="flex items-center gap-[16px] text-sm text-text-tertiary">
            <span className="inline-flex items-center gap-[6px]">
              <Icon icon={File01Icon} size={14} />
              {done}/{total} stages complete
            </span>
            {project.status === "draft" && (
              <span className="inline-flex items-center gap-[6px]">
                <Icon icon={PencilEdit01Icon} size={14} />
                Next: {STEP_LABELS[next]}
              </span>
            )}
            <span className="ml-auto shrink-0">{lastTouch}</span>
          </div>

          {/* Slim progress bar */}
          <div
            role="progressbar"
            aria-label={`${project.name} progress`}
            aria-valuenow={done}
            aria-valuemin={0}
            aria-valuemax={total}
            className="h-[4px] w-full overflow-hidden rounded-full bg-bg-surface-raised"
          >
            <div
              className="h-full rounded-full bg-violet-500 transition-[width] duration-normal ease-decelerate"
              style={{ width: `${(done / total) * 100}%` }}
            />
          </div>
        </div>
      </button>
    </li>
  );
}

function StatusBadge({
  status,
}: {
  status: ManualProject["status"];
}) {
  if (status === "completed") {
    return (
      <span className="inline-flex h-[24px] shrink-0 items-center gap-[6px] rounded-full bg-bg-success-subtle px-[10px] text-2xs font-bold uppercase tracking-wider text-text-success">
        <Icon icon={CheckmarkBadge01Icon} size={12} />
        Completed
      </span>
    );
  }
  return (
    <span className="inline-flex h-[24px] shrink-0 items-center gap-[6px] rounded-full bg-bg-surface-raised px-[10px] text-2xs font-bold uppercase tracking-wider text-text-secondary">
      <Icon icon={PencilEdit01Icon} size={12} />
      Draft
    </span>
  );
}

// ───────────────────────── empty ─────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-[12px] rounded-2xl border border-border bg-bg-surface px-[24px] py-[48px] text-center">
      <span
        aria-hidden
        className="inline-flex h-[48px] w-[48px] items-center justify-center rounded-full bg-bg-brand-subtle text-text-brand"
      >
        <Icon icon={File01Icon} size={20} />
      </span>
      <p className="text-md font-semibold text-text-primary">
        No projects yet
      </p>
      <p className="max-w-[420px] text-sm text-text-secondary">
        Start a project from Home — pick <strong>Build manually</strong> and
        choose <strong>Create New Project</strong>. It will land here so you
        can resume any time.
      </p>
      <Link
        href="/"
        className="mt-[8px] inline-flex h-[36px] items-center rounded-lg bg-violet-600 px-[16px] text-sm font-bold text-text-on-brand outline-none transition-colors duration-fast hover:bg-violet-500 focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        Go to Home
      </Link>
    </div>
  );
}

// ───────────────────────── format ─────────────────────────────

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
