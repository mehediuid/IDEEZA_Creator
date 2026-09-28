"use client";

// Interim sections: today's project page (project-details.tsx before Task C1),
// moved here when the page became a shell with slots, so the page keeps
// showing all it did while the real slots land. Each fills one slot in
// project-page.tsx until its task replaces it, and that task deletes it here:
//   LegacyProducts                         → the Products tab task (§5.6)
//   LegacyNetwork                          → the Network tab task (§5.9, C6)
//   LegacyEditorBlock, LegacyDetailsBlock  → the rail task (§5.10)
//   LegacyManageBlock                      → the rail task (§5.10, C8's Manage)
// The task that removes the last export deletes this file.
//
// Changes from the old page, each forced by the data layer:
// - "the" build is the newest one the project holds; the old page read
//   `project.buildId` alone (COR-86);
// - Open in editor resumes `resumeStepOf()`;
// - dates use the one formatter (A3's formatDateTime).

import * as React from "react";
import Link from "next/link";
import {
  ActivityIcon,
  AlertCircleIcon,
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  CheckmarkBadge01Icon,
  File01Icon,
  HelpCircleIcon,
  PencilEdit01Icon,
} from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { NetworkSection } from "@/components/network/network-section";
import { DeleteProjectControl } from "@/components/projects/delete-project-dialog";
import { bomFor } from "@/lib/create/build-artifacts";
import {
  ITEM_LABELS,
  ITEM_SUBTITLES,
  type BuildItem,
  type BuildJob,
} from "@/lib/create/history";
import type { ProjectView } from "@/lib/manual/project-read";
import { formatDateTime } from "@/lib/manual/project-summary";
import {
  FLOW_STEPS,
  STEP_LABELS,
  completedCount,
  productLabel,
  stepHref,
  useManualProjects,
} from "@/lib/manual/projects";
import { RailBlock } from "./frame";
import type { SlotProps } from "./slots";

/** The newest build this project holds that is still in this browser. */
function legacyBuild(view: ProjectView): BuildJob | null {
  let newest: BuildJob | null = null;
  for (const ref of view.refs) {
    if (ref.job && (!newest || ref.job.createdAt > newest.createdAt)) newest = ref.job;
  }
  return newest;
}

export function LegacyProducts({ view }: SlotProps) {
  const build = legacyBuild(view);
  return (
    <section aria-labelledby="deliverables-heading">
      <h2 id="deliverables-heading" className="text-lg font-bold text-text-primary">
        Build deliverables
      </h2>
      {build ? (
        <Deliverables build={build} />
      ) : view.refs.length > 0 ? (
        <EmptyNote
          icon={HelpCircleIcon}
          title="The build behind this project is gone"
          body="This project was saved from an AI build, but that build is no longer in this browser's history — its deliverables can't be shown."
        />
      ) : (
        <EmptyNote
          icon={PencilEdit01Icon}
          title="Started by hand"
          body="This project wasn't generated from a concept, so there are no AI deliverables to review. Everything is authored in the editor modules."
        />
      )}
    </section>
  );
}

export function LegacyNetwork({ project, view }: SlotProps) {
  return <NetworkSection project={project} build={legacyBuild(view)} />;
}

export function LegacyEditorBlock({ project }: SlotProps) {
  const { selectProject } = useManualProjects();
  const done = completedCount(project);
  const summary = `${done} of ${FLOW_STEPS.length} steps complete`;
  return (
    <RailBlock id="editor" title="Editor progress" summary={summary}>
      <p className="text-sm tabular-nums text-text-secondary">{summary}</p>
      <ul role="list" className="mt-[14px] flex flex-col gap-[6px]">
        {FLOW_STEPS.map((step) => {
          const stepDone = project.flowState[step];
          return (
            <li key={step}>
              <Link
                href={stepHref(project, step)}
                onClick={() => selectProject(project.id)}
                className="flex items-center gap-[12px] rounded-lg border border-border bg-bg-surface px-[14px] py-[10px] outline-none transition-colors duration-fast hover:border-border-strong focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                <span aria-hidden className={stepDone ? "text-text-success" : "text-text-tertiary"}>
                  <Icon icon={stepDone ? CheckmarkBadge01Icon : File01Icon} size={18} />
                </span>
                <span className="min-w-0 flex-1 truncate text-md font-medium text-text-primary">
                  {STEP_LABELS[step]}
                </span>
                <span className="shrink-0 text-2xs font-bold uppercase tracking-wider text-text-tertiary">
                  {stepDone ? "Done" : "Not started"}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </RailBlock>
  );
}

export function LegacyDetailsBlock({ project, view }: SlotProps) {
  const build = legacyBuild(view);
  return (
    <RailBlock id="details" title="Details">
      <dl className="flex flex-col gap-[14px] text-sm">
        <Row label="Status">{project.status === "completed" ? "Completed" : "Draft"}</Row>
        <Row label="Product">{productLabel(project)}</Row>
        <Row label="Created">{formatDateTime(project.createdAt)}</Row>
        <Row label="Last updated">{formatDateTime(project.updatedAt)}</Row>
        <Row label="Address">
          <span className="font-mono text-xs">/{project.slug}</span>
        </Row>
        <Row label="Source">
          {build ? (
            <Link
              href={`/build/${build.id}`}
              className="inline-flex items-center gap-[4px] rounded-sm font-semibold text-text-brand no-underline outline-none transition-colors duration-fast hover:text-text-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              AI build
              <Icon icon={ArrowUpRight01Icon} size={14} />
            </Link>
          ) : view.refs.length > 0 ? (
            "AI build · not in this browser"
          ) : (
            "Built manually"
          )}
        </Row>
      </dl>
    </RailBlock>
  );
}

// A7's interim Manage block (COR-67), moved from the old page. C8 renders
// DeleteProjectControl in its own Manage block and deletes this one.
export function LegacyManageBlock({ project, view, viewer, brief }: SlotProps) {
  return (
    <RailBlock id="manage" title="Manage" collapsible={false}>
      <DeleteProjectControl
        project={project}
        viewer={viewer}
        status={view.summary.status}
        draft={brief}
        showcased={view.summary.showcase !== null}
        productCount={view.summary.productCount}
        refs={view.refs}
      />
    </RailBlock>
  );
}

// ───────────────────────── deliverables ─────────────────────────

function Deliverables({ build }: { build: BuildJob }) {
  const bom = React.useMemo(() => bomFor(build), [build]);

  return (
    <>
      <p className="mt-[6px] text-sm text-text-secondary">
        Saved from the build of{" "}
        <span className="font-semibold text-text-primary">{build.title}</span> —{" "}
        {bom.unique} unique {bom.unique === 1 ? "part" : "parts"}, {bom.units}{" "}
        {bom.units === 1 ? "unit" : "units"} in the bill of materials.
      </p>

      <ul role="list" className="mt-[14px] flex flex-col gap-[8px]">
        {build.items.map((item) => {
          const content = (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-md font-semibold text-text-primary">
                  {ITEM_LABELS[item.kind]}
                </p>
                <p className="mt-[2px] truncate text-sm text-text-tertiary">
                  {ITEM_SUBTITLES[item.kind]}
                </p>
              </div>
              <ItemStatus item={item} />
            </>
          );
          return (
            <li key={item.kind}>
              {item.status === "skipped" ? (
                <div className="flex items-center gap-[14px] rounded-xl border border-border bg-bg-surface p-[14px] opacity-70">
                  {content}
                </div>
              ) : (
                <Link
                  href={`/build/${build.id}?tab=${item.kind}`}
                  className="flex items-center gap-[14px] rounded-xl border border-border bg-bg-surface p-[14px] outline-none transition-colors duration-fast hover:border-border-strong focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  {content}
                  <span aria-hidden className="shrink-0 text-text-tertiary">
                    <Icon icon={ArrowRight01Icon} size={18} />
                  </span>
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-[14px] flex flex-wrap items-center gap-[10px]">
        <Link
          href={`/build/${build.id}`}
          className="inline-flex h-[36px] items-center gap-[8px] rounded-lg border border-border bg-bg-surface px-[14px] text-sm font-semibold text-text-primary outline-none transition-colors duration-fast hover:border-border-strong focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          Open the build
          <Icon icon={ArrowUpRight01Icon} size={16} />
        </Link>
        <Link
          href={`/build/${build.id}?tab=parts`}
          className="inline-flex h-[36px] items-center gap-[8px] rounded-lg border border-border bg-bg-surface px-[14px] text-sm font-semibold text-text-primary outline-none transition-colors duration-fast hover:border-border-strong focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          Bill of materials
          <Icon icon={ArrowUpRight01Icon} size={16} />
        </Link>
      </div>
    </>
  );
}

function ItemStatus({ item }: { item: BuildItem }) {
  const pill =
    "inline-flex h-[26px] shrink-0 items-center gap-[6px] rounded-full px-[10px] text-2xs font-bold uppercase tracking-wider";
  if (item.status === "ready") {
    return (
      <span className={`${pill} bg-bg-success-subtle text-text-success`}>
        <Icon icon={CheckmarkBadge01Icon} size={13} />
        Ready
      </span>
    );
  }
  if (item.status === "failed") {
    return (
      <span className={`${pill} bg-bg-error-subtle text-text-error`}>
        <Icon icon={AlertCircleIcon} size={13} />
        Failed
      </span>
    );
  }
  if (item.status === "skipped") {
    return <span className={`${pill} bg-bg-surface-raised text-text-tertiary`}>Not produced</span>;
  }
  return (
    <span className={`${pill} bg-bg-brand-subtle text-text-brand tabular-nums`}>
      <Icon icon={ActivityIcon} size={13} />
      {Math.round(item.progress)}%
    </span>
  );
}

// ───────────────────────── pieces ─────────────────────────

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-[16px]">
      <dt className="shrink-0 font-medium text-text-secondary">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium text-text-primary">{children}</dd>
    </div>
  );
}

function EmptyNote({ icon, title, body }: { icon: IconValue; title: string; body: string }) {
  return (
    <div className="mt-[14px] flex flex-col items-center gap-[8px] rounded-[12px] border border-dashed border-border px-[24px] py-[36px] text-center">
      <span
        aria-hidden
        className="inline-flex h-[40px] w-[40px] items-center justify-center rounded-full bg-bg-surface-raised text-text-tertiary"
      >
        <Icon icon={icon} size={18} />
      </span>
      <p className="text-md font-semibold text-text-primary">{title}</p>
      <p className="max-w-[420px] text-sm text-text-secondary">{body}</p>
    </div>
  );
}
