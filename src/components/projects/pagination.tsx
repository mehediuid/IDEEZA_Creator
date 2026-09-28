"use client";

// The shared page-number control (Phase 2 spec §3.3 X10). This is
// my-projects.tsx's own `Pagination` — the same markup, the same "Page {p}
// of {n}" phone fallback — pulled out so the Customers panel
// (details/customers-tab.tsx) can use it too. T25 points my-projects.tsx at
// this file instead of its private copy; nothing here changes what either
// caller already renders.
//
// ‹ 1 … n-1 n n+1 … last ›, the current page marked. Below a 480 px content
// box the numbers give way to "Page {p} of {n}". Hidden on a single page —
// the caller decides that (`pageCount > 1`) and doesn't render this at all.

import * as React from "react";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { pageItemsFor } from "@/lib/manual/project-list";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (p: number) => void;
}) {
  const btn =
    "inline-flex h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-solid px-[8px] text-md font-medium outline-none transition-colors duration-normal ease-decelerate focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-page motion-reduce:transition-none [@container(max-width:559px)]:h-[44px] [@container(max-width:559px)]:min-w-[44px]";
  const idle =
    "border-border bg-bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary";
  const numbersOnly = "[@container(max-width:479px)]:hidden";

  return (
    <nav aria-label="Pagination" className="mt-[28px] flex items-center justify-end gap-[6px]">
      <button
        type="button"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className={cn(btn, idle, "disabled:cursor-not-allowed disabled:opacity-40")}
      >
        <Icon icon={ArrowLeft01Icon} size={16} />
      </button>

      <p className="px-[8px] text-md font-medium text-text-secondary [@container(min-width:480px)]:hidden">
        Page {page} of {pageCount}
      </p>

      {pageItemsFor(page, pageCount).map((it, i) =>
        it === "ellipsis" ? (
          <span
            key={`e-${i}`}
            aria-hidden
            className={cn(
              "inline-flex h-[36px] min-w-[24px] items-center justify-center text-md text-text-tertiary",
              numbersOnly,
            )}
          >
            …
          </span>
        ) : (
          <button
            key={it}
            type="button"
            aria-label={`Page ${it}`}
            aria-current={it === page ? "page" : undefined}
            onClick={() => onChange(it)}
            className={cn(
              btn,
              numbersOnly,
              it === page ? "border-transparent bg-bg-brand-subtle font-semibold text-text-brand" : idle,
            )}
          >
            {it}
          </button>
        ),
      )}

      <button
        type="button"
        aria-label="Next page"
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
        className={cn(btn, idle, "disabled:cursor-not-allowed disabled:opacity-40")}
      >
        <Icon icon={ArrowRight01Icon} size={16} />
      </button>
    </nav>
  );
}
