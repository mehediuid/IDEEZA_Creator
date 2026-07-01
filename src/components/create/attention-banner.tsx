"use client";

// BuildAttentionBanner — spec §7b. Renders a floating banner whenever a
// build needs the user's attention (ready to review OR a piece failed
// and needs a retry).
//
// The banner:
//   • Reads `topAttention` from the create-history store (the first
//     not-yet-dismissed attention item, prioritised by build order).
//   • Auto-hides when the user is already on the target build page —
//     no point telling them about something they're already looking at.
//   • Renders a primary "Open build" CTA + a secondary "Dismiss" that
//     records a dismiss timestamp. The red dot on the sidebar's History
//     row stays on independently (until the user actually resolves the
//     situation), so dismiss never hides the underlying signal.
//   • Sits at the BOTTOM of the viewport (toast-style) so it can't
//     occlude the prompt bar or chat header.

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight01Icon,
  Cancel01Icon,
  Notification03Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { useCreateHistory } from "@/lib/create/history";

export function BuildAttentionBanner() {
  const pathname = usePathname();
  const { topAttention, dismissAttention } = useCreateHistory();

  if (!topAttention) return null;

  // Auto-hide on the target build page — the build status / review
  // surface itself IS the action they'd take.
  if (pathname.startsWith(`/build/${topAttention.job.id}`)) return null;

  const accent =
    topAttention.reason === "retry"
      ? "border-bg-error text-text-error"
      : "border-border-brand text-text-brand";

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[24px] z-toast flex justify-center px-[16px]"
    >
      <div
        className={[
          "pointer-events-auto flex w-full max-w-[640px] items-center gap-[16px] rounded-2xl border bg-bg-surface px-[16px] py-[14px] shadow-3",
          accent.split(" ")[0],
        ].join(" ")}
      >
        <span
          aria-hidden
          className={[
            "inline-flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full",
            topAttention.reason === "retry"
              ? "bg-bg-error-subtle text-text-error"
              : "bg-bg-brand-subtle text-text-brand",
          ].join(" ")}
        >
          <Icon icon={Notification03Icon} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-2xs font-bold uppercase tracking-wider text-text-tertiary">
            {topAttention.reason === "retry"
              ? "Build needs attention"
              : "Build ready to review"}
          </p>
          <p className="mt-[2px] truncate text-md text-text-primary">
            {topAttention.message}
          </p>
        </div>
        <Link
          href={`/build/${topAttention.job.id}`}
          className="inline-flex h-[36px] shrink-0 items-center gap-[8px] rounded-lg bg-violet-600 px-[14px] text-sm font-semibold text-text-on-brand outline-none transition-colors duration-fast hover:bg-violet-500 focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          Open build
          <Icon icon={ArrowRight01Icon} />
        </Link>
        <button
          type="button"
          aria-label="Dismiss this notification"
          onClick={() => dismissAttention(topAttention.job.id)}
          className="inline-flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-lg text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-surface-raised hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <Icon icon={Cancel01Icon} />
        </button>
      </div>
    </div>
  );
}
