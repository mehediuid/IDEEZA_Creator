"use client";

// BuildAttentionBanner — spec §7b / Ai-Flow frame 20. Renders a floating
// toast whenever a build needs the user's attention: ready to review, a
// piece failed and needs a retry, or the build is paused waiting on
// credits.
//
// The banner:
//   • Reads `topAttention` from the create-history store (the first
//     not-yet-dismissed attention item, prioritised by build order).
//   • Auto-hides when the user is already on the target build page —
//     no point telling them about something they're already looking at.
//   • Renders a primary CTA ("Open build" / "Top up credits") + a ×
//     dismiss that records a dismiss timestamp. The red dot on the
//     sidebar's History row stays on independently (until the user
//     actually resolves the situation), so dismiss never hides the
//     underlying signal.
//   • Sits top-centre of the viewport (frame 20) so it can't occlude
//     the prompt bar.

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight01Icon,
  Cancel01Icon,
  Notification03Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { useCreateHistory, ITEM_LABELS, type BuildItem } from "@/lib/create/history";

// "PCB" · "PCB and Firmware code" — same join rule build-status.tsx uses
// for its own failed-item rollups.
function joinLabels(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? "";
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

function failedLabels(items: BuildItem[]): string {
  return joinLabels(
    items.filter((i) => i.status === "failed").map((i) => ITEM_LABELS[i.kind]),
  );
}

export function BuildAttentionBanner() {
  const pathname = usePathname();
  const { topAttention, dismissAttention } = useCreateHistory();

  // Re-plays the enter transition each time a new attention item takes
  // the slot (a different job id, or the same job's reason changing).
  const [entered, setEntered] = React.useState(false);
  const attentionKey = topAttention
    ? `${topAttention.job.id}:${topAttention.reason}`
    : null;
  React.useEffect(() => {
    if (!attentionKey) return;
    setEntered(false);
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, [attentionKey]);

  if (!topAttention) return null;

  const { job, reason } = topAttention;

  // Auto-hide on the target build page — the build status / review
  // surface itself IS the action they'd take.
  if (pathname.startsWith(`/build/${job.id}`)) return null;

  const warning = reason !== "review";

  const eyebrow =
    reason === "retry"
      ? "BUILD NEEDS A RETRY"
      : reason === "credits"
        ? "BUILD PAUSED"
        : "BUILD READY TO REVIEW";

  const message =
    reason === "retry"
      ? `${job.title} · the ${failedLabels(job.items)} step failed`
      : reason === "credits"
        ? `${job.title} is paused — top up credits to start it`
        : `${job.title} is ready`;

  const ctaLabel = reason === "credits" ? "Top up credits" : "Open build";
  const ctaHref = reason === "credits" ? "/history#credits" : `/build/${job.id}`;

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        "fixed top-[16px] left-1/2 z-toast w-[540px] max-w-[calc(100vw-32px)] -translate-x-1/2",
        "flex items-center gap-[12px] rounded-2xl border bg-bg-surface px-[16px] py-[12px] shadow-3",
        warning ? "border-[var(--color-border-warning)]" : "border-border-brand",
        "transition-all duration-normal ease-out motion-reduce:transition-none",
        entered ? "translate-y-0 opacity-100" : "-translate-y-[8px] opacity-0",
      ].join(" ")}
    >
      <span
        aria-hidden
        className={[
          "inline-flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-lg",
          warning
            ? "bg-bg-warning-subtle text-text-warning"
            : "bg-bg-brand-subtle text-text-brand",
        ].join(" ")}
      >
        <Icon icon={Notification03Icon} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-2xs font-bold uppercase tracking-wider text-text-tertiary">
          {eyebrow}
        </p>
        <p className="mt-[2px] truncate text-md font-semibold text-text-primary">
          {message}
        </p>
      </div>
      <Link
        href={ctaHref}
        className="inline-flex h-[36px] shrink-0 items-center gap-[8px] rounded-lg bg-violet-600 px-[14px] text-sm font-semibold text-text-on-brand outline-none transition-colors duration-fast hover:bg-violet-500 focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        {ctaLabel}
        <Icon icon={ArrowRight01Icon} />
      </Link>
      <button
        type="button"
        aria-label="Dismiss this notification"
        onClick={() => dismissAttention(job.id)}
        className="inline-flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-lg text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-surface-raised hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <Icon icon={Cancel01Icon} />
      </button>
    </div>
  );
}
