"use client";

// Pagination — `‹ 1 2 3 … 10 ›` control used at the bottom of each
// History table. URL-driven so the back/forward buttons feel right and
// links are share-safe. Page size is fixed at 10.
//
// Accessibility:
//   • <nav aria-label="Pagination"> wrapper.
//   • Current page carries aria-current="page" — screen readers
//     announce position even when colour is suppressed.
//   • All controls are real <button>s ≥ 36×36 with focus rings.
//   • Window of 5 numeric pages around the current; the first and last
//     pages are always pinned with an ellipsis between them.

import * as React from "react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";

export const HISTORY_PAGE_SIZE = 10;

export function Pagination({
  page,
  pageCount,
  onPage,
}: {
  page: number;
  pageCount: number;
  onPage: (p: number) => void;
}) {
  if (pageCount <= 1) return null;
  const items = buildItems(page, pageCount);

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-end gap-[8px]"
    >
      <NavButton
        ariaLabel="Previous page"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        <Icon icon={ArrowLeft01Icon} />
      </NavButton>

      <ul role="list" className="flex items-center gap-[4px]">
        {items.map((it, i) =>
          it === "…" ? (
            <li
              key={`gap-${i}`}
              aria-hidden
              className="inline-flex h-[36px] w-[24px] items-center justify-center text-md text-text-tertiary"
            >
              …
            </li>
          ) : (
            <li key={it}>
              <button
                type="button"
                aria-label={`Page ${it}`}
                aria-current={it === page ? "page" : undefined}
                onClick={() => onPage(it)}
                className={[
                  "inline-flex h-[36px] min-w-[36px] items-center justify-center rounded-md px-[10px] text-md outline-none transition-colors duration-fast",
                  "focus-visible:ring-2 focus-visible:ring-border-focus",
                  it === page
                    ? "bg-violet-600 font-semibold text-text-on-brand"
                    : "font-regular text-text-secondary hover:bg-bg-surface-raised hover:text-text-primary",
                ].join(" ")}
              >
                {it}
              </button>
            </li>
          ),
        )}
      </ul>

      <NavButton
        ariaLabel="Next page"
        disabled={page >= pageCount}
        onClick={() => onPage(page + 1)}
      >
        <Icon icon={ArrowRight01Icon} />
      </NavButton>
    </nav>
  );
}

function NavButton({
  children,
  ariaLabel,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  ariaLabel: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-[36px] w-[36px] items-center justify-center rounded-md border border-border bg-bg-surface text-text-secondary outline-none transition-colors duration-fast hover:border-border-strong hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

// Build a `1 … (page-1) page (page+1) … N` sequence, capped so we
// always show at most ~7 entries. Heading + tail get their own pinned
// page numbers to give the user a sense of total scale.
type Item = number | "…";
function buildItems(page: number, total: number): Item[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const out: Item[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(total - 1, page + 1);
  if (start > 2) out.push("…");
  for (let p = start; p <= end; p++) out.push(p);
  if (end < total - 1) out.push("…");
  out.push(total);
  return out;
}
