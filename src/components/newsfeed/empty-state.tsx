"use client";

// EmptyState — two variants:
//   • "following"  — the user follows nobody yet. An invitation, not an
//     apology: send them to Discover.
//   • "noResults"  — a search / category came back empty; offer to clear.

import Link from "next/link";
import { Compass01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";

export function EmptyState({
  variant,
  onClear,
}: {
  variant: "following" | "noResults";
  onClear?: () => void;
}) {
  if (variant === "following") {
    return (
      <div className="flex flex-col items-center gap-[12px] rounded-2xl border border-border bg-bg-surface px-[24px] py-[48px] text-center">
        <span
          aria-hidden
          className="inline-flex h-[48px] w-[48px] items-center justify-center rounded-full bg-bg-brand-subtle text-text-brand"
        >
          <Icon icon={Compass01Icon} size={22} />
        </span>
        <p className="text-md font-semibold text-text-primary">
          Follow creators to fill this feed
        </p>
        <p className="max-w-[420px] text-sm text-text-secondary">
          Following shows projects from creators you follow. Discover creators
          and follow a few to start building your feed.
        </p>
        <Link
          href="/innovations"
          className="mt-[8px] inline-flex h-[36px] items-center rounded-lg bg-violet-600 px-[16px] text-sm font-bold text-text-on-brand outline-none transition-colors duration-fast hover:bg-violet-500 focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          Discover creators
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-[12px] rounded-2xl border border-border bg-bg-surface px-[24px] py-[48px] text-center">
      <span
        aria-hidden
        className="inline-flex h-[48px] w-[48px] items-center justify-center rounded-full bg-bg-surface-raised text-text-tertiary"
      >
        <Icon icon={Search01Icon} size={22} />
      </span>
      <p className="text-md font-semibold text-text-primary">
        No projects match that
      </p>
      <p className="max-w-[420px] text-sm text-text-secondary">
        Try another category or search.
      </p>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="mt-[8px] inline-flex h-[36px] items-center rounded-lg border border-border bg-bg-surface px-[16px] text-sm font-semibold text-text-primary outline-none transition-colors duration-fast hover:border-border-strong focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
