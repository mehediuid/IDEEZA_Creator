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
//     the prompt bar — via the shared `ToastLayer` (src/app/layout.tsx),
//     portalled into its "attention" slot so it can never overlap the
//     video-render toasts, which live in the same layer's "render" slot.

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight01Icon,
  Cancel01Icon,
  Notification03Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { useCreateHistory, ITEM_LABELS, type BuildItem } from "@/lib/create/history";
// "PCB" · "PCB and Firmware code" — the build page's own join rule, so
// the two surfaces can't word one list two ways.
import { joinLabels } from "./build-status";

function failedLabels(items: BuildItem[]): string[] {
  return items.filter((i) => i.status === "failed").map((i) => ITEM_LABELS[i.kind]);
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

  // The shared toast layer's "attention" slot — queried after mount so this
  // never touches `document` during SSR; the portal is skipped until it's
  // found.
  const [slot, setSlot] = React.useState<HTMLElement | null>(null);
  React.useEffect(() => {
    setSlot(document.getElementById("ideeza-toast-layer-attention"));
  }, []);

  if (!topAttention || !slot) return null;

  const { job, reason } = topAttention;

  // Auto-hide on any build page — every build page carries its own
  // "← Back" control the toast would otherwise sit on top of, and the
  // status/review surface itself IS the action they'd take.
  if (pathname.startsWith("/build/")) return null;

  // And on the chat the build belongs to, for the same reason: the build
  // runs there now — its pipeline is in that rail and its deliverables are
  // on that canvas — so a toast saying it is ready, over a control offering
  // to take the maker somewhere else, is offering them the page they are
  // already standing on.
  if (job.chatId && pathname === `/chat/${job.chatId}`) return null;

  // A system failure (the whole job died on our side, not the maker's)
  // gets its own tone and copy — it is not "a piece failed", it's
  // everything, and `failBuildSystem` marks every unfinished item
  // failed, so rendering it as a partial-failure rollup produced broken
  // grammar
  // ("…the 3D model, PCB, Firmware code, Wiring and Parts step failed").
  const systemFailure = job.failure === "system";
  const tone: "brand" | "warning" | "error" = systemFailure
    ? "error"
    : reason === "review"
      ? "brand"
      : "warning";

  const eyebrow = systemFailure
    ? "Build stopped"
    : reason === "retry"
      ? "Build needs a retry"
      : reason === "credits"
        ? "Build paused"
        : "Build ready to review";

  // The work is called by its project's name, as it is everywhere else.
  const name = job.projectChoiceName?.trim() || job.title;
  const message = systemFailure
    ? `${name} · the build stopped on our side${
        job.creditsRefunded ? " — your credits were refunded" : ""
      }`
    : reason === "retry"
      ? (() => {
          const labels = failedLabels(job.items);
          const step = labels.length <= 1 ? "step" : "steps";
          return `${name} · the ${joinLabels(labels)} ${step} failed`;
        })()
      : reason === "credits"
        ? `${name} is paused — top up credits to start it`
        : `${name} is ready`;

  const ctaLabel = reason === "credits" ? "Top up credits" : "Open build";
  // The build's home is the chat it was started from — that is where its
  // pipeline and its output are. /build/<id> stays as the destination for a
  // job whose chat this browser no longer holds.
  const ctaHref =
    reason === "credits"
      ? "/history#credits"
      : job.chatId
        ? `/chat/${job.chatId}`
        : `/build/${job.id}`;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className={[
        "pointer-events-auto w-[540px] max-w-[calc(100vw-32px)]",
        "flex items-center gap-[12px] rounded-2xl border bg-bg-surface px-[16px] py-[12px] shadow-3",
        tone === "error"
          ? "border-[var(--color-border-error)]"
          : tone === "warning"
            ? "border-[var(--color-border-warning)]"
            : "border-border-brand",
        "transition-[transform,opacity] duration-normal ease-out motion-reduce:transition-none",
        entered ? "translate-y-0 opacity-100" : "translate-y-[8px] opacity-0 md:-translate-y-[8px]",
      ].join(" ")}
    >
      <span
        aria-hidden
        className={[
          "inline-flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-lg",
          tone === "error"
            ? "bg-bg-error-subtle text-text-error"
            : tone === "warning"
              ? "bg-bg-warning-subtle text-text-warning"
              : "bg-bg-brand-subtle text-text-brand",
        ].join(" ")}
      >
        <Icon icon={Notification03Icon} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-text-tertiary">{eyebrow}</p>
        <p className="mt-[2px] line-clamp-2 text-md font-semibold text-text-primary">
          {message}
        </p>
      </div>
      <Link
        href={ctaHref}
        className="inline-flex h-[36px] shrink-0 items-center gap-[8px] rounded-lg bg-bg-brand px-[14px] text-sm font-semibold text-text-on-brand outline-none transition-colors duration-fast hover:bg-bg-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus"
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
    </div>,
    slot,
  );
}
