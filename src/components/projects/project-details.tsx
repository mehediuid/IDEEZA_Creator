"use client";

// ProjectDetails — /projects/[id]. One real project, read from
// `useManualProjects()`: its name, description, product, status and
// dates, the AI build it was saved from (`project.buildId` →
// `useCreateHistory()`), and how far it has got through the editor.
//
// Everything the old Figma trace asserted but the model cannot answer —
// owner, wallet address, mint status, collection, blockchain, patent and
// trademark rows, view/like/comment counts, a products grid and its
// pagination — is gone rather than faked. An id that matches nothing
// gets a not-found state, not a placeholder project.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ActivityIcon,
  AlertCircleIcon,
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  CheckmarkBadge01Icon,
  CpuIcon,
  File01Icon,
  HelpCircleIcon,
  PencilEdit01Icon,
} from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import {
  ITEM_LABELS,
  ITEM_SUBTITLES,
  useCreateHistory,
  type BuildItem,
  type BuildJob,
} from "@/lib/create/history";
import { bomFor } from "@/lib/create/build-artifacts";
import {
  FLOW_STEPS,
  STEP_LABELS,
  completedCount,
  firstIncompleteStep,
  productLabel,
  stepHref,
  useManualProjects,
  type ManualProject,
} from "@/lib/manual/projects";

export function ProjectDetails({ id }: { id: string }) {
  const router = useRouter();
  const { hydrated, projects, selectProject } = useManualProjects();
  const { hydrated: buildsHydrated, builds } = useCreateHistory();

  // Cards link by id; a slug in the address bar resolves too, so a
  // hand-typed /projects/<slug> finds the same project.
  const project =
    projects.find((p) => p.id === id) ??
    projects.find((p) => p.slug === id) ??
    null;

  const buildId = project?.buildId;
  const build = React.useMemo<BuildJob | null>(() => {
    if (!buildId) return null;
    return builds.find((b) => b.id === buildId) ?? null;
  }, [buildId, builds]);

  if (!hydrated || !buildsHydrated) {
    return (
      <div className="mx-auto w-full max-w-[1280px] px-[32px] py-[28px] text-sm text-text-tertiary">
        Loading…
      </div>
    );
  }

  if (!project) return <NotFound id={id} />;

  const open = () => {
    selectProject(project.id);
    router.push(stepHref(project, firstIncompleteStep(project)));
  };

  return (
    <div className="mx-auto w-full max-w-[1280px] px-[32px] py-[28px]">
      {/* Breadcrumb. The primary action sits on the title row below it,
          clear of the shell's floating profile button. */}
      <nav
        aria-label="Breadcrumb"
        className="mb-[20px] flex min-w-0 items-center gap-[6px] text-sm"
      >
        <Link
          href="/projects"
          className="rounded-sm font-medium text-text-secondary outline-none transition-colors duration-fast hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          My projects
        </Link>
        <span aria-hidden className="text-text-tertiary">
          <Icon icon={ArrowRight01Icon} size={15} />
        </span>
        <span
          aria-current="page"
          className="truncate font-semibold text-text-primary"
        >
          {project.name}
        </span>
      </nav>

      <div className="flex flex-col gap-[28px] min-[1100px]:flex-row min-[1100px]:items-start">
        {/* ───────── left column ───────── */}
        <section className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-[12px]">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              {project.name}
            </h1>
            <StatusBadge status={project.status} />
            <button
              type="button"
              onClick={open}
              className="ml-auto inline-flex h-[40px] items-center gap-[8px] rounded-lg bg-violet-600 px-[16px] text-sm font-bold text-text-on-brand outline-none transition-colors duration-fast hover:bg-violet-500 focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              <Icon icon={CpuIcon} size={18} />
              Open in editor
            </button>
          </div>
          <p className="mt-[6px] text-sm text-text-secondary">
            Product:{" "}
            <span className="font-semibold text-text-primary">
              {productLabel(project)}
            </span>
          </p>

          {build?.conceptImageUrl && (
            <div className="mt-[18px] overflow-hidden rounded-[12px] border border-border bg-bg-surface-raised">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={build.conceptImageUrl}
                alt={`Concept image this project was generated from`}
                className="block max-h-[360px] w-full object-cover"
              />
            </div>
          )}

          <p className="mt-[18px] max-w-[68ch] text-sm leading-relaxed text-text-secondary">
            {project.description || "No description yet."}
          </p>

          {/* Deliverables from the build this project came from */}
          <section aria-labelledby="deliverables-heading" className="mt-[32px]">
            <h2
              id="deliverables-heading"
              className="text-lg font-bold text-text-primary"
            >
              Build deliverables
            </h2>
            {build ? (
              <Deliverables build={build} />
            ) : project.buildId ? (
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

          {/* Editor progress */}
          <section aria-labelledby="progress-heading" className="mt-[32px]">
            <div className="flex flex-wrap items-baseline justify-between gap-[10px]">
              <h2
                id="progress-heading"
                className="text-lg font-bold text-text-primary"
              >
                Editor progress
              </h2>
              <p className="text-sm tabular-nums text-text-secondary">
                {completedCount(project)} of {FLOW_STEPS.length} steps complete
              </p>
            </div>
            <ul role="list" className="mt-[14px] flex flex-col gap-[6px]">
              {FLOW_STEPS.map((step) => {
                const done = project.flowState[step];
                return (
                  <li key={step}>
                    <Link
                      href={stepHref(project, step)}
                      onClick={() => selectProject(project.id)}
                      className="flex items-center gap-[12px] rounded-lg border border-border bg-bg-surface px-[14px] py-[10px] outline-none transition-colors duration-fast hover:border-border-strong focus-visible:ring-2 focus-visible:ring-border-focus"
                    >
                      <span
                        aria-hidden
                        className={
                          done ? "text-text-success" : "text-text-tertiary"
                        }
                      >
                        <Icon
                          icon={done ? CheckmarkBadge01Icon : File01Icon}
                          size={18}
                        />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-md font-medium text-text-primary">
                        {STEP_LABELS[step]}
                      </span>
                      <span className="shrink-0 text-2xs font-bold uppercase tracking-wider text-text-tertiary">
                        {done ? "Done" : "Not started"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </section>

        {/* ───────── right rail ───────── */}
        <aside
          aria-label="Project details"
          className="w-full shrink-0 rounded-[16px] border border-border bg-bg-surface p-[20px] min-[1100px]:sticky min-[1100px]:top-[28px] min-[1100px]:w-[360px]"
        >
          <h2 className="text-lg font-bold text-text-primary">Details</h2>
          <dl className="mt-[16px] flex flex-col gap-[14px] text-sm">
            <Row label="Status">
              {project.status === "completed" ? "Completed" : "Draft"}
            </Row>
            <Row label="Product">{productLabel(project)}</Row>
            <Row label="Created">{formatDate(project.createdAt)}</Row>
            <Row label="Last updated">{formatDate(project.updatedAt)}</Row>
            <Row label="Address">
              <span className="font-mono text-xs">/{project.slug}</span>
            </Row>
            <Row label="Source">
              {build ? (
                <Link
                  href={`/build/${build.id}`}
                  className="inline-flex items-center gap-[4px] rounded-sm font-semibold text-text-brand underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  AI build
                  <Icon icon={ArrowUpRight01Icon} size={14} />
                </Link>
              ) : (
                "Built manually"
              )}
            </Row>
          </dl>
        </aside>
      </div>
    </div>
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
        {build.items.map((item) => (
          <li key={item.kind}>
            <Link
              href={`/build/${build.id}?tab=${item.kind}`}
              className="flex items-center gap-[14px] rounded-xl border border-border bg-bg-surface p-[14px] outline-none transition-colors duration-fast hover:border-border-strong focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-md font-semibold text-text-primary">
                  {ITEM_LABELS[item.kind]}
                </p>
                <p className="mt-[2px] truncate text-sm text-text-tertiary">
                  {ITEM_SUBTITLES[item.kind]}
                </p>
              </div>
              <ItemStatus item={item} />
              <span aria-hidden className="shrink-0 text-text-tertiary">
                <Icon icon={ArrowRight01Icon} size={18} />
              </span>
            </Link>
          </li>
        ))}
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
    return (
      <span className={`${pill} bg-bg-surface-raised text-text-tertiary`}>
        Not produced
      </span>
    );
  }
  return (
    <span className={`${pill} bg-bg-brand-subtle text-text-brand tabular-nums`}>
      <Icon icon={ActivityIcon} size={13} />
      {Math.round(item.progress)}%
    </span>
  );
}

// ───────────────────────── pieces ─────────────────────────

function StatusBadge({ status }: { status: ManualProject["status"] }) {
  const completed = status === "completed";
  return (
    <span
      className={[
        "inline-flex h-[26px] items-center gap-[6px] rounded-full px-[12px] text-2xs font-bold uppercase tracking-wide",
        completed
          ? "bg-bg-success-subtle text-text-success"
          : "bg-bg-brand-subtle text-text-brand",
      ].join(" ")}
    >
      <Icon
        icon={completed ? CheckmarkBadge01Icon : PencilEdit01Icon}
        size={13}
      />
      {completed ? "Completed" : "Draft"}
    </span>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-[16px]">
      <dt className="shrink-0 font-medium text-text-secondary">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium text-text-primary">
        {children}
      </dd>
    </div>
  );
}

function EmptyNote({
  icon,
  title,
  body,
}: {
  icon: IconValue;
  title: string;
  body: string;
}) {
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

function NotFound({ id }: { id: string }) {
  return (
    <div className="mx-auto flex w-full max-w-[520px] flex-col items-center gap-[12px] px-[32px] py-[80px] text-center">
      <span
        aria-hidden
        className="inline-flex h-[48px] w-[48px] items-center justify-center rounded-full bg-bg-surface-raised text-text-tertiary"
      >
        <Icon icon={HelpCircleIcon} size={22} />
      </span>
      <h1 className="text-2xl font-bold text-text-primary">
        We couldn&apos;t find this project
      </h1>
      <p className="text-md text-text-secondary">
        Nothing in this browser matches{" "}
        <span className="font-mono text-sm text-text-primary">{id}</span>. It
        may have been deleted, or saved in a different browser.
      </p>
      <Link
        href="/projects"
        className="mt-[8px] inline-flex h-[40px] items-center rounded-lg bg-violet-600 px-[16px] text-sm font-bold text-text-on-brand outline-none transition-colors duration-fast hover:bg-violet-500 focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        Back to My projects
      </Link>
    </div>
  );
}

// ───────────────────────── format ─────────────────────────

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
