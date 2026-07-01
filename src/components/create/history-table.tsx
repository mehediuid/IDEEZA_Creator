"use client";

// HistoryTable — the table-style list used by both /history tabs.
// Matches the design's columns exactly:
//
//   Serial No. · Prompt text · Result Thumbnail · Date & Time · Status · Action
//
// Per user direction:
//   • Status pills only — no Start/Stop. Try Again appears on Error rows.
//   • Click any row → expands the detail panel (HistoryRowDetail).
//
// Token + a11y discipline (impeccable + ui-ux-pro-max):
//   • Real semantic <table> with roles set explicitly.
//   • Status conveyed by icon + text, never colour alone.
//   • Action buttons ≥ 36px tall, focus-visible rings, aria-labels.
//   • Status colours map to DS tokens (success / brand / error / surface).

import * as React from "react";
import Link from "next/link";
import {
  ActivityIcon,
  AlertCircleIcon,
  CheckmarkBadge01Icon,
  EyeIcon,
  Image01Icon,
  Refresh01Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";

export type HistoryRow = {
  id: string;
  prompt: string;
  projectName?: string;
  thumbnailUrl?: string;
  ts: number;
  status: "done" | "progress" | "error";
  progress?: number; // 0–100, when status === "progress"
  // Where the "View" CTA routes when status === "done".
  viewHref: string;
  // Optional onRetry; required when status === "error".
  onRetry?: () => void;
};

export function HistoryTable({
  rows,
  serialOffset,
  expandedId,
  onToggleExpand,
  renderDetail,
}: {
  rows: HistoryRow[];
  serialOffset: number;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  renderDetail: (row: HistoryRow) => React.ReactNode;
}) {
  return (
    <div
      role="table"
      aria-label="History"
      className="overflow-hidden rounded-2xl border border-border bg-bg-surface"
    >
      <HeaderRow />
      <div role="rowgroup">
        {rows.map((row, idx) => (
          <React.Fragment key={row.id}>
            <Row
              row={row}
              serial={serialOffset + idx + 1}
              expanded={expandedId === row.id}
              onToggle={() => onToggleExpand(row.id)}
            />
            {expandedId === row.id && (
              <div
                role="row"
                className="border-t border-border bg-bg-page"
              >
                {renderDetail(row)}
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────── header ──────────────────────────────

const COLS = [
  { key: "serial", label: "Serial No.", w: "w-[88px]" },
  { key: "prompt", label: "Prompt text", w: "w-auto" },
  { key: "thumb", label: "Result Thumbnail", w: "w-[120px]" },
  { key: "date", label: "Date & Time", w: "w-[180px]" },
  { key: "status", label: "Status", w: "w-[120px]" },
  { key: "action", label: "Action", w: "w-[140px]" },
] as const;

function HeaderRow() {
  return (
    <div
      role="row"
      className="grid grid-cols-[88px_minmax(0,1fr)_120px_180px_120px_140px] items-center gap-[16px] border-b border-border bg-bg-page px-[20px] py-[14px]"
    >
      {COLS.map((c) => (
        <div
          key={c.key}
          role="columnheader"
          className="text-2xs font-bold uppercase tracking-wider text-text-tertiary"
        >
          {c.label}
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────── data row ────────────────────────────

function Row({
  row,
  serial,
  expanded,
  onToggle,
}: {
  row: HistoryRow;
  serial: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <div
      role="row"
      tabIndex={0}
      aria-expanded={expanded}
      onClick={onToggle}
      onKeyDown={onKey}
      className={[
        "grid grid-cols-[88px_minmax(0,1fr)_120px_180px_120px_140px] items-center gap-[16px] border-b border-border px-[20px] py-[12px] outline-none transition-colors duration-fast",
        "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus",
        expanded ? "bg-bg-surface-raised" : "hover:bg-bg-surface-raised",
        "cursor-pointer",
      ].join(" ")}
    >
      {/* Serial */}
      <div
        role="cell"
        className="text-md font-medium tabular-nums text-text-secondary"
      >
        {String(serial).padStart(2, "0")}
      </div>

      {/* Prompt */}
      <div role="cell" className="min-w-0">
        {row.projectName && (
          <p className="truncate text-2xs font-bold text-text-brand">
            [{row.projectName}]
          </p>
        )}
        <p className="truncate text-md text-text-primary">{row.prompt}</p>
      </div>

      {/* Thumbnail */}
      <div role="cell">
        <Thumb row={row} />
      </div>

      {/* Date & Time */}
      <div
        role="cell"
        className="text-md tabular-nums text-text-secondary"
      >
        {formatTimestamp(row.ts)}
      </div>

      {/* Status */}
      <div role="cell">
        <StatusPill row={row} />
      </div>

      {/* Action — clicks here MUST NOT toggle the row, so they
          stopPropagation. */}
      <div
        role="cell"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        className="flex items-center"
      >
        <Action row={row} />
      </div>
    </div>
  );
}

function Thumb({ row }: { row: HistoryRow }) {
  if (row.status === "error" || !row.thumbnailUrl) {
    return (
      <div
        aria-hidden
        className="flex h-[48px] w-[72px] items-center justify-center rounded-md bg-bg-error-subtle text-text-error"
      >
        <Icon icon={Image01Icon} />
      </div>
    );
  }
  return (
    <div className="h-[48px] w-[72px] overflow-hidden rounded-md bg-bg-surface-raised">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={row.thumbnailUrl}
        alt=""
        className="h-full w-full object-cover"
      />
    </div>
  );
}

function StatusPill({ row }: { row: HistoryRow }) {
  if (row.status === "done") {
    return (
      <span className="inline-flex h-[28px] items-center gap-[6px] rounded-full bg-bg-success-subtle px-[12px] text-2xs font-bold uppercase tracking-wider text-text-success">
        <Icon icon={CheckmarkBadge01Icon} size={14} />
        Done
      </span>
    );
  }
  if (row.status === "error") {
    return (
      <span className="inline-flex h-[28px] items-center gap-[6px] rounded-full bg-bg-error-subtle px-[12px] text-2xs font-bold uppercase tracking-wider text-text-error">
        <Icon icon={AlertCircleIcon} size={14} />
        Error
      </span>
    );
  }
  return (
    <span className="inline-flex h-[28px] items-center gap-[6px] rounded-full bg-bg-brand-subtle px-[12px] text-2xs font-bold uppercase tracking-wider text-text-brand tabular-nums">
      <Icon icon={ActivityIcon} size={14} />
      {Math.round(row.progress ?? 0)}%
    </span>
  );
}

function Action({ row }: { row: HistoryRow }) {
  if (row.status === "done") {
    return (
      <Link
        href={row.viewHref}
        aria-label="View"
        className="inline-flex h-[36px] items-center gap-[8px] rounded-lg bg-violet-600 px-[14px] text-sm font-semibold text-text-on-brand outline-none transition-colors duration-fast hover:bg-violet-500 focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <Icon icon={EyeIcon} />
        View
      </Link>
    );
  }
  if (row.status === "error") {
    return (
      <button
        type="button"
        onClick={row.onRetry}
        aria-label="Try Again"
        className="inline-flex h-[36px] items-center gap-[8px] rounded-lg bg-bg-error-subtle px-[14px] text-sm font-semibold text-text-error outline-none transition-colors duration-fast hover:bg-bg-error-subtle/80 focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <Icon icon={Refresh01Icon} />
        Try Again
      </button>
    );
  }
  // In progress — no action by user direction.
  return <span aria-hidden className="text-text-tertiary">—</span>;
}

// ───────────────────────── formatting ─────────────────────────────

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const date = `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
  let hr = d.getHours();
  const min = d.getMinutes();
  const sec = d.getSeconds();
  const ampm = hr >= 12 ? "PM" : "AM";
  hr = hr % 12 || 12;
  return `${date} | ${pad(hr)}:${pad(min)}:${pad(sec)} ${ampm}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
