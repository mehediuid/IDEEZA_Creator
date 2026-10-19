"use client";

// BuildAttentionBanner — spec §7b / Ai-Flow frame 20. Renders a floating
// toast whenever a build needs the user's attention: ready to review, a
// piece failed and needs a retry, or the build is paused waiting on
// credits.
//
// The banner:
//   • Shows the first not-yet-dismissed attention item (by build order)
//     that the Notification settings let toast: none while a daily or
//     weekly summary is chosen, during quiet hours, for a muted project,
//     or with Product notices switched off (lib/notifications/filter.ts).
//     The bell still lists it.
//   • Auto-hides when the user is already on the target build page —
//     no point telling them about something they're already looking at.
//   • Renders a primary CTA ("Open build" / "Buy credits") + a ×
//     dismiss that records a dismiss timestamp. The red dot on the
//     sidebar's History row stays on independently (until the user
//     actually resolves the situation), so dismiss never hides the
//     underlying signal.
//   • Sits top-centre of the page (frame 20) so it can't occlude
//     the prompt bar — via the shared `ToastLayer` (src/app/layout.tsx),
//     portalled into its "attention" slot so it can never overlap the
//     video-render toasts, which live in the same layer's "render" slot.
//     The page is main, not the window: the layer spans main's edges,
//     which this measures, so the toast centres beside the sidebar too.

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
import { buildCost } from "@/lib/create/credits";
import { productsOf, useCreateHistory, ITEM_LABELS, type BuildItem } from "@/lib/create/history";
import { buildNotices } from "@/lib/notifications/sources";
import { useToastGate } from "@/components/notifications/use-notices";
import { BuyCreditsButton } from "@/components/credits/buy-credits";
// "PCB" · "PCB and Firmware code" — the build page's own join rule, so
// the two surfaces can't word one list two ways.
import { joinLabels } from "./build-status";

function failedLabels(items: BuildItem[]): string[] {
  return items.filter((i) => i.status === "failed").map((i) => ITEM_LABELS[i.kind]);
}

/** Lays the toast layer over main (the sidebar's width off one side, measured
 *  as blog/editor/phone-bar.tsx does), so its toast centres on the page rather
 *  than 140 px left of it. Data, not design values: written as the two custom
 *  properties the layer's own classes read, and taken off again on the way out. */
function useLayerOverMain() {
  React.useEffect(() => {
    const main = document.getElementById("main-content");
    const layer = document.getElementById("ideeza-toast-layer");
    if (!main || !layer) return;
    const on = () => {
      const r = main.getBoundingClientRect();
      layer.style.setProperty("--toast-main-left", `${Math.max(0, Math.round(r.left))}px`);
      layer.style.setProperty("--toast-main-right", `${Math.max(0, Math.round(window.innerWidth - r.right))}px`);
    };
    on();
    const ro = new ResizeObserver(on);
    ro.observe(main);
    window.addEventListener("resize", on);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", on);
      layer.style.removeProperty("--toast-main-left");
      layer.style.removeProperty("--toast-main-right");
    };
  }, []);
}

export function BuildAttentionBanner() {
  const pathname = usePathname();
  const { attentionBuilds, dismissAttention, getChat } = useCreateHistory();
  const allowed = useToastGate();
  const topAttention = React.useMemo(
    () =>
      attentionBuilds.find((a) => !a.job.attentionDismissedAt && allowed(buildNotices([a], (id) => !!getChat(id))[0])) ?? null,
    [attentionBuilds, allowed, getChat],
  );
  useLayerOverMain();

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
        ? `${name} is paused — buy credits to start it`
        : `${name} is ready`;

  // The build's home is the chat it was started from — that is where its
  // pipeline and its output are. /build/<id> stays as the destination for a
  // job whose chat this browser no longer holds. A paused build's way out is
  // the Buy credits dialog, in place: the build starts once it's covered.
  const ctaHref = job.chatId ? `/chat/${job.chatId}` : `/build/${job.id}`;
  const ctaClass =
    "inline-flex h-[36px] shrink-0 items-center gap-[8px] rounded-lg bg-bg-brand px-[14px] text-sm font-semibold text-text-on-brand outline-none transition-colors duration-fast hover:bg-bg-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus";

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className={[
        "pointer-events-auto w-[540px] max-w-full",
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
      {reason === "credits" ? (
        <BuyCreditsButton need={buildCost(productsOf(job).length)} className={ctaClass}>
          Buy credits
          <Icon icon={ArrowRight01Icon} />
        </BuyCreditsButton>
      ) : (
        <Link href={ctaHref} className={ctaClass}>
          Open build
          <Icon icon={ArrowRight01Icon} />
        </Link>
      )}
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
