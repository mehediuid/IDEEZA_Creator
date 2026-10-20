"use client";

// History › Builds: the table the design draws (Prompt text · Result
// Thumbnail · Date & Time · Status · Action). A row opens onto that build's
// steps: each product's artifacts as they really stand, live while it runs,
// with how long each one took. Below an 880 px page the row folds to two
// lines and the steps stack.

import * as React from "react";
import Link from "next/link";
import {
  ActivityIcon,
  AlertCircleIcon,
  ArrowDown01Icon,
  CheckmarkBadge01Icon,
  Clock01Icon,
  EyeIcon,
  Image01Icon,
  PauseIcon,
  Refresh01Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import {
  ITEM_LABELS,
  ITEM_SUBTITLES,
  type BuildItemKind,
} from "@/lib/create/history";
import {
  durationLabel,
  type BuildEntry,
  type BuildStep,
  type BuildStepGroup,
} from "@/lib/create/history-list";
import { useDates } from "@/lib/settings/use-dates";
import { cn } from "@/lib/utils";
import { useMinuteClock } from "./build-status";

const WIDE_GRID =
  "[@container(min-width:880px)]:grid-cols-[minmax(160px,1fr)_96px_172px_140px_120px]";

export function BuildsTable({
  rows,
  expandedId,
  onToggle,
  onRetry,
  onRetryStep,
}: {
  rows: BuildEntry[];
  expandedId: string | null;
  onToggle: (id: string) => void;
  onRetry: (row: BuildEntry) => void;
  onRetryStep: (row: BuildEntry, productId: string, kind: string) => void;
}) {
  return (
    <div className="mt-[16px] overflow-hidden rounded-2xl border border-solid border-border bg-bg-surface">
      <div role="table" aria-label="Builds">
        <div
          role="row"
          className={cn(
            "hidden gap-[16px] border-b border-solid border-border bg-bg-page px-[20px] py-[14px] [@container(min-width:880px)]:grid",
            WIDE_GRID,
          )}
        >
          {["Prompt text", "Result thumbnail", "Date & time", "Status", "Action"].map((label) => (
            <div key={label} role="columnheader" className="text-2xs font-bold uppercase tracking-wider text-text-tertiary">
              {label}
            </div>
          ))}
        </div>
        <div role="rowgroup">
          {rows.map((row) => (
            <React.Fragment key={row.id}>
              <BuildRow
                row={row}
                expanded={expandedId === row.id}
                onToggle={() => onToggle(row.id)}
                onRetry={() => onRetry(row)}
              />
              {expandedId === row.id && (
                <div role="row" id={`build-${row.id}`} className="border-b border-solid border-border bg-bg-page">
                  <div role="cell">
                    <BuildDetail row={row} onRetryStep={(productId, kind) => onRetryStep(row, productId, kind)} />
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────── a row ──────────────────────────────

function BuildRow({
  row,
  expanded,
  onToggle,
  onRetry,
}: {
  row: BuildEntry;
  expanded: boolean;
  onToggle: () => void;
  onRetry: () => void;
}) {
  const dates = useDates();
  const many = row.products.length > 1;
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  return (
    <div
      role="row"
      tabIndex={0}
      aria-expanded={expanded}
      aria-controls={expanded ? `build-${row.id}` : undefined}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      className={cn(
        "grid cursor-pointer grid-cols-[72px_minmax(0,1fr)] items-center gap-x-[12px] gap-y-[8px] border-b border-solid border-border px-[16px] py-[12px] outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus [@container(min-width:880px)]:gap-x-[16px] [@container(min-width:880px)]:px-[20px]",
        WIDE_GRID,
        expanded ? "bg-bg-surface-raised" : "hover:bg-bg-surface-raised",
      )}
    >
      <div role="cell" className="col-start-2 row-start-1 min-w-0 [@container(min-width:880px)]:col-start-1">
        {(row.projectName || row.older) && (
          <p className="flex min-w-0 items-center gap-[6px] text-2xs font-bold">
            {row.projectId && row.projectName && (
              <Link
                href={`/projects/${row.projectId}`}
                onClick={stop}
                onKeyDown={stop}
                className="truncate rounded-sm text-text-brand no-underline outline-none transition-colors duration-fast hover:text-text-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                {row.projectName}
              </Link>
            )}
            {row.older && <span className="shrink-0 text-text-tertiary">Older build</span>}
          </p>
        )}
        <p className="truncate text-md text-text-primary" title={row.prompt}>
          {row.prompt}
        </p>
        {many && (
          <p className="truncate text-sm text-text-tertiary">
            {row.products.length} products · {row.products.map((p) => p.name).join(", ")}
          </p>
        )}
      </div>

      <div role="cell" className="col-start-1 row-span-2 row-start-1 self-start [@container(min-width:880px)]:col-start-2 [@container(min-width:880px)]:row-span-1 [@container(min-width:880px)]:self-center">
        <div className="flex h-[48px] w-[72px] items-center justify-center overflow-hidden rounded-md bg-bg-surface-raised text-text-tertiary">
          {row.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={row.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Icon icon={Image01Icon} />
          )}
        </div>
      </div>

      <div className="col-start-2 row-start-2 flex flex-wrap items-center gap-[8px] [@container(min-width:880px)]:contents">
        <div role="cell" className="text-sm tabular-nums text-text-secondary [@container(min-width:880px)]:col-start-3 [@container(min-width:880px)]:row-start-1 [@container(min-width:880px)]:text-md">
          {`${dates.date(row.createdAt, { style: "numeric" })} | ${dates.time(row.createdAt)}`}
        </div>
        <div role="cell" className="[@container(min-width:880px)]:col-start-4 [@container(min-width:880px)]:row-start-1">
          <StatusPill row={row} />
        </div>
        <div
          role="cell"
          onClick={stop}
          onKeyDown={stop}
          className="flex items-center [@container(min-width:880px)]:col-start-5 [@container(min-width:880px)]:row-start-1"
        >
          {row.status === "failed" && !row.older ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex h-[36px] items-center gap-[8px] rounded-lg bg-bg-error-subtle px-[14px] text-sm font-semibold text-text-error outline-none transition-colors duration-fast hover:bg-[color-mix(in_srgb,var(--color-bg-error-subtle)_72%,var(--color-bg-surface))] focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              <Icon icon={Refresh01Icon} />
              Try again
            </button>
          ) : (
            <Link
              href={row.href}
              className="inline-flex h-[36px] items-center gap-[8px] rounded-lg bg-violet-600 px-[14px] text-sm font-semibold text-text-on-brand no-underline outline-none transition-colors duration-fast hover:bg-violet-500 focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              <Icon icon={EyeIcon} />
              View
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

const PILL = "inline-flex h-[28px] items-center gap-[6px] rounded-full px-[12px] text-2xs font-bold uppercase tracking-wider tabular-nums";

function StatusPill({ row }: { row: BuildEntry }) {
  switch (row.status) {
    case "ready":
      return <span className={cn(PILL, "bg-bg-success-subtle text-text-success")}><Icon icon={CheckmarkBadge01Icon} size={14} />Ready</span>;
    case "failed":
      return <span className={cn(PILL, "bg-bg-error-subtle text-text-error")}><Icon icon={AlertCircleIcon} size={14} />Failed</span>;
    case "paused":
      return <span className={cn(PILL, "bg-bg-warning-subtle text-text-warning")}><Icon icon={PauseIcon} size={14} />Paused</span>;
    case "waiting":
      return <span className={cn(PILL, "bg-bg-brand-subtle text-text-brand")}><Icon icon={Clock01Icon} size={14} />Waiting</span>;
    default:
      return <span className={cn(PILL, "bg-bg-brand-subtle text-text-brand")}><Icon icon={ActivityIcon} size={14} />Building {row.progress ?? 0}%</span>;
  }
}

// ──────────────────────────── the detail ───────────────────────────

/** What a whole build says above its steps: when, how long, where it stands. */
function useFacts(row: BuildEntry): string[] {
  const dates = useDates();
  const now = useMinuteClock();
  const facts: string[] = [];
  if (row.startedAt) facts.push(`Started ${dates.date(row.startedAt, { style: "numeric" })} | ${dates.time(row.startedAt)}`);
  if (row.status === "building" && row.startedAt) {
    const min = Math.floor((now - row.startedAt) / 60000);
    facts.push(min < 1 ? "Running for under a minute" : `Running for ${min} min`);
  }
  if ((row.status === "ready" || row.status === "failed") && row.startedAt && row.endedAt && row.endedAt >= row.startedAt) {
    facts.push(`Took ${durationLabel(row.endedAt - row.startedAt)}`);
  }
  if (row.status === "waiting") {
    facts.push(row.ahead ? `${row.ahead} build${row.ahead === 1 ? "" : "s"} ahead in line` : "Next in line");
  }
  if (row.status === "paused") facts.push("Paused · open the build to see why");
  if (row.products.length > 1) facts.push(`${row.products.length} products`);
  return facts;
}

function BuildDetail({
  row,
  onRetryStep,
}: {
  row: BuildEntry;
  onRetryStep: (productId: string, kind: string) => void;
}) {
  const facts = useFacts(row);
  const many = row.products.length >= 3;
  // Three or more products: one open at a time, the one that needs a look
  // first (the same rule as the build's own rail).
  const first =
    row.products.find((p) => p.failed || p.steps.some((s) => s.status === "building")) ?? row.products[0];
  const [openId, setOpenId] = React.useState<string | undefined>(first?.id);
  const canRetry = !row.older;

  return (
    <div className="flex flex-col gap-[16px] px-[16px] py-[20px] [@container(min-width:880px)]:px-[20px]">
      <section aria-label="Original prompt">
        <p className="text-2xs font-bold uppercase tracking-wider text-text-tertiary">Prompt</p>
        <p className="mt-[6px] whitespace-pre-wrap text-md text-text-primary">{row.prompt}</p>
      </section>

      {facts.length > 0 && (
        <p className="flex flex-wrap gap-x-[16px] gap-y-[4px] text-sm text-text-secondary">
          {facts.map((f) => (
            <span key={f}>{f}</span>
          ))}
        </p>
      )}
      {row.older && (
        <p className="text-sm text-text-secondary">
          A newer build of this chat replaced this one, so View opens the newer build. This is the record of what this one made.
        </p>
      )}

      {row.products.length === 1 ? (
        <Steps group={row.products[0]} onRetry={canRetry ? (kind) => onRetryStep(row.products[0].id, kind) : undefined} />
      ) : (
        <div className="flex flex-col gap-[12px]">
          {row.products.map((p) => {
            const open = !many || openId === p.id;
            const head = (
              <>
                <span className="min-w-0 flex-1 truncate text-md font-semibold text-text-primary">{p.name}</span>
                <span className="shrink-0 text-sm tabular-nums text-text-tertiary">
                  {p.done} of {p.steps.length} done{p.failed ? ` · ${p.failed} with issues` : ""}
                </span>
              </>
            );
            return (
              <section key={p.id} aria-label={p.name} className="rounded-xl border border-solid border-border bg-bg-surface">
                {many ? (
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenId(open ? undefined : p.id)}
                    className="flex w-full items-center gap-[12px] rounded-xl px-[16px] py-[12px] text-left outline-none transition-colors duration-fast hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus"
                  >
                    {head}
                    <span aria-hidden className={cn("inline-flex text-text-tertiary transition-transform duration-normal ease-decelerate motion-reduce:transition-none", open ? "rotate-180" : "rotate-0")}>
                      <Icon icon={ArrowDown01Icon} size={16} />
                    </span>
                  </button>
                ) : (
                  <div className="flex items-center gap-[12px] px-[16px] py-[12px]">{head}</div>
                )}
                {open && (
                  <div className="border-t border-solid border-border px-[16px]">
                    <Steps group={p} onRetry={canRetry ? (kind) => onRetryStep(p.id, kind) : undefined} />
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {row.projectId && row.projectName && (
        <Link
          href={`/projects/${row.projectId}`}
          className="w-fit rounded-sm text-md font-semibold text-text-link no-underline outline-none hover:text-text-link-hover focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          Open {row.projectName}
        </Link>
      )}
    </div>
  );
}

function Steps({ group, onRetry }: { group: BuildStepGroup; onRetry?: (kind: string) => void }) {
  return (
    <ul role="list" className="flex flex-col">
      {group.steps.map((step, i) => (
        <li
          key={step.kind}
          className={cn(
            "grid grid-cols-[minmax(0,1fr)] gap-x-[16px] gap-y-[4px] py-[12px] [@container(min-width:880px)]:grid-cols-[minmax(0,1fr)_140px_220px] [@container(min-width:880px)]:items-start",
            i === 0 ? "" : "border-t border-solid border-border-subtle",
          )}
        >
          <div className="min-w-0">
            <p className="text-md font-semibold text-text-primary">{ITEM_LABELS[step.kind as BuildItemKind] ?? step.kind}</p>
            <p className="mt-[2px] text-sm text-text-tertiary">{ITEM_SUBTITLES[step.kind as BuildItemKind]}</p>
          </div>
          <div className="text-sm tabular-nums text-text-secondary [@container(min-width:880px)]:pt-[2px]">
            {step.ms !== undefined ? durationLabel(step.ms) : null}
          </div>
          <div className="[@container(min-width:880px)]:pt-[2px]">
            <Outcome step={step} onRetry={onRetry ? () => onRetry(step.kind) : undefined} />
          </div>
        </li>
      ))}
    </ul>
  );
}

const MARK = "inline-flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full";

function Outcome({ step, onRetry }: { step: BuildStep; onRetry?: () => void }) {
  if (step.status === "ready") {
    return (
      <span className="inline-flex items-center gap-[8px] text-sm font-medium text-text-success">
        <span aria-hidden className={cn(MARK, "bg-bg-success-subtle")}><Icon icon={CheckmarkBadge01Icon} size={14} /></span>
        Successfully done
      </span>
    );
  }
  if (step.status === "failed") {
    return (
      <span className="inline-flex flex-wrap items-center gap-[8px] text-sm font-medium text-text-error">
        <span aria-hidden className={cn(MARK, "bg-bg-error-subtle")}><Icon icon={AlertCircleIcon} size={14} /></span>
        There are some issues
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-[28px] items-center gap-[6px] rounded-md bg-bg-error-subtle px-[10px] text-sm font-semibold text-text-error outline-none transition-colors duration-fast hover:bg-[color-mix(in_srgb,var(--color-bg-error-subtle)_72%,var(--color-bg-surface))] focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <Icon icon={Refresh01Icon} size={14} />
            Try again
          </button>
        )}
      </span>
    );
  }
  if (step.status === "building") {
    return (
      <span className="inline-flex items-center gap-[8px] text-sm font-medium tabular-nums text-text-brand">
        <span aria-hidden className={cn(MARK, "bg-bg-brand-subtle")}><Icon icon={ActivityIcon} size={14} /></span>
        Generating · {step.progress}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-[8px] text-sm font-medium text-text-tertiary">
      <span aria-hidden className={cn(MARK, "bg-bg-subtle")}><Icon icon={Clock01Icon} size={14} /></span>
      Waiting
    </span>
  );
}
