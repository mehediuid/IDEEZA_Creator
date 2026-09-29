"use client";

// GlobalRenderIndicator — a stack of toasts in the bottom-right corner, on
// every page, one per video job the maker hasn't dismissed (Phase 2 VIDEO
// P2-VIDEO-3). Newest on top; the title is "{Product} · {Project}":
//   rendering → "Video rendering · {eta} left" + Cancel + ×
//   ready     → "Video ready" + Watch (plays it, and hides the toast) + ×
//   failed    → "Video render failed" + Try again (the Generate dialog, with
//               that take's inputs) + ×
// × hides the toast (acknowledge) — it no longer deletes the job, which used
// to erase the clip link (D7). A v1 Brief job (no file) keeps Cancel while
// it runs and offers nothing to watch.
//
// It also mounts VideoUpkeep (verify clip files, migrate the Brief's old
// clip), which needs the history provider this component sits inside.
// Browser-notification opt-in lives in the Generate dialog's render view.
//
// The toasts are the maker's: a buyer view — Preview as buyer or as a
// contributor (`?view=`), and Explore marketplace (`/marketplace/*`) — shows
// none (errata 56). Try again is `can(owner, "video.generate", { locked })`,
// so a project sold in full offers none. Watch and Try again hide their toast,
// so when their dialog closes focus goes to the next toast, else <main>.

import * as React from "react";
import { createPortal } from "react-dom";
import { usePathname, useSearchParams } from "next/navigation";
import { useCreateHistory } from "@/lib/create/history";
import { AS_PARAM, BUYER_VIEW, CONTRIBUTOR_VIEW, VIEW_PARAM } from "@/lib/manual/buyer-preview";
import { can, type Viewer } from "@/lib/manual/permissions";
import { projectLockOf } from "@/lib/manual/edit-gate";
import { buildsOf, productsOfProject } from "@/lib/manual/project-read";
import { useManualProjects } from "@/lib/manual/projects";
import { useMarket } from "@/lib/market/market-store";
import { useProjectVideos } from "@/lib/video/store";
import type { VideoTake } from "@/lib/video/types";
import { toastHeading } from "@/lib/video/video-copy";
import { GenerateVideoDialog, videoTargetOf, type VideoTarget } from "./generate-video-dialog";
import { VideoPlayerDialog } from "./video-player";
import {
  VideoUpkeep,
  etaLabel,
  isProductJob,
  progressOf,
  useVideoJobs,
  type VideoJob,
} from "./video-jobs-provider";

type Watching = { projectId: string; productId: string; takeId: string; productName: string };

const OWNER: Viewer = { kind: "local-owner" };

/** After a dialog opened from a toast closes: that toast is gone, so focus
 *  goes to the next toast's first control, else the page's <main>. */
function refocusAfterToast() {
  requestAnimationFrame(() => {
    const active = document.activeElement;
    if (active && active !== document.body && document.contains(active)) return;
    const next =
      document.querySelector<HTMLElement>("#ideeza-toast-layer-render button") ?? document.getElementById("main-content");
    next?.focus({ preventScroll: true });
  });
}

export function GlobalRenderIndicator() {
  return (
    <>
      <VideoUpkeep />
      {/* useSearchParams: a prerendered page renders this part on the client only. */}
      <React.Suspense fallback={null}>
        <RenderToasts />
      </React.Suspense>
    </>
  );
}

/** A buyer view: Preview as buyer / as a contributor, or Explore marketplace. */
function useBuyerView(): boolean {
  const pathname = usePathname();
  const search = useSearchParams();
  const view = search.get(VIEW_PARAM);
  const preview = view === BUYER_VIEW || (view === CONTRIBUTOR_VIEW && search.has(AS_PARAM));
  return preview || /^\/marketplace(\/|$)/.test(pathname ?? "");
}

function RenderToasts() {
  const { jobs, hydrated, now, acknowledge, dismiss, cancelRender } = useVideoJobs();
  const { projects } = useManualProjects();
  const { builds } = useCreateHistory();
  // Read so the lock is asked again whenever a sale lands.
  const { data: market } = useMarket();
  const buyerView = useBuyerView();
  const [watching, setWatching] = React.useState<Watching | null>(null);
  const [retry, setRetry] = React.useState<{ target: VideoTarget; takeId: string } | null>(null);

  // The shared toast layer's "render" slot (src/app/layout.tsx) — queried
  // after mount so this never touches `document` during SSR; the portal is
  // skipped until it's found. Keeps this stack from painting over the build
  // attention banner, which lives in the same layer's "attention" slot.
  const [renderSlot, setRenderSlot] = React.useState<HTMLElement | null>(null);
  React.useEffect(() => {
    // The slot is in the DOM only after mount; reading it once here is the point.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRenderSlot(document.getElementById("ideeza-toast-layer-render"));
  }, []);

  /** The Generate dialog's target for a failed product job, when its project
   *  and product still exist and the maker may still render for it. */
  const targetOf = (j: VideoJob): VideoTarget | null => {
    if (!isProductJob(j)) return null;
    const project = projects.find((p) => p.id === j.projectId);
    if (!project || !can(OWNER, "video.generate", { locked: projectLockOf(project, market.sales) !== null })) return null;
    const product = productsOfProject(project, buildsOf(project, builds)).find((x) => x.id === j.productId);
    return product ? videoTargetOf(project, product) : null;
  };

  const visible = hydrated && !buyerView ? jobs.filter((j) => j.acknowledged !== true) : [];
  // Newest job on top.
  const stacked = [...visible].reverse();

  return (
    <>
      {renderSlot &&
        stacked.length > 0 &&
        createPortal(
          <div className="flex flex-col items-end gap-[8px]" role="status" aria-live="polite" aria-label="Video render status">
            {stacked.map((j) => {
              const target = j.stage === "failed" ? targetOf(j) : null;
              return (
                <ToastLine
                  key={j.id}
                  job={j}
                  now={now}
                  onWatch={
                    isProductJob(j) && j.stage === "done"
                      ? () => {
                          acknowledge(j.id);
                          setWatching({
                            projectId: j.projectId!,
                            productId: j.productId!,
                            takeId: j.id,
                            productName: j.render!.productName,
                          });
                        }
                      : null
                  }
                  onCancel={
                    j.stage === "done" || j.stage === "failed"
                      ? null
                      : () => (isProductJob(j) ? cancelRender(j.id) : dismiss(j.id))
                  }
                  onRetry={
                    target
                      ? () => {
                          acknowledge(j.id);
                          setRetry({ target, takeId: j.id });
                        }
                      : null
                  }
                  onDismiss={() => acknowledge(j.id)}
                />
              );
            })}

            <style>{`
              @keyframes ix-render-toast-in {
                from { opacity: 0; transform: translateY(6px); }
                to   { opacity: 1; transform: translateY(0); }
              }
              .ix-render-toast { animation: ix-render-toast-in .2s var(--motion-easing-decelerate); }
              @media (prefers-reduced-motion: reduce) {
                .ix-render-toast { animation: none; }
              }
            `}</style>
          </div>,
          renderSlot,
        )}

      {watching && (
        <WatchDialog
          watching={watching}
          onClose={() => {
            setWatching(null);
            refocusAfterToast();
          }}
        />
      )}

      <GenerateVideoDialog
        open={retry !== null}
        target={retry?.target ?? null}
        fromTakeId={retry?.takeId ?? null}
        onClose={() => {
          setRetry(null);
          refocusAfterToast();
        }}
      />
    </>
  );
}

function WatchDialog({ watching, onClose }: { watching: Watching; onClose: () => void }) {
  const { record } = useProjectVideos(watching.projectId);
  const found = record?.products[watching.productId]?.takes.find((t) => t.id === watching.takeId) ?? null;
  // Kept once seen: a file that goes missing shows the player's "lost" copy.
  const [take, setTake] = React.useState<VideoTake | null>(null);
  if (!take && found && found.readyAt) setTake(found);
  return (
    <VideoPlayerDialog
      open
      take={take}
      productName={watching.productName}
      projectId={watching.projectId}
      onClose={onClose}
    />
  );
}

function ToastLine({
  job,
  now,
  onWatch,
  onCancel,
  onRetry,
  onDismiss,
}: {
  job: VideoJob;
  now: number;
  onWatch: (() => void) | null;
  onCancel: (() => void) | null;
  onRetry: (() => void) | null;
  onDismiss: () => void;
}) {
  const isDone = job.stage === "done";
  const isFailed = job.stage === "failed";
  const { etaSec } = progressOf(job, now);
  const title = job.title || "Untitled video";

  // The attention toast's shape, so the app has one: a surface card, a tinted
  // tile carrying the state, the state in words, one action in the card's own
  // button style.
  const tone = isDone ? "success" : isFailed ? "error" : "info";
  const kicker = toastHeading(isDone ? "ready" : isFailed ? "failed" : "rendering", etaLabel(etaSec));
  const action = isDone
    ? onWatch && { label: "Watch", run: onWatch }
    : isFailed
      ? onRetry && { label: "Try again", run: onRetry }
      : onCancel && { label: "Cancel", run: onCancel };
  const tap = "max-md:h-[var(--touch-min)] [@media(pointer:coarse)]:h-[var(--touch-min)]";

  return (
    <div
      className={[
        "ix-render-toast pointer-events-auto flex w-[400px] max-w-[calc(100vw-32px)] items-center gap-[12px] rounded-2xl border bg-bg-surface px-[14px] py-[10px] shadow-3",
        tone === "error"
          ? "border-[var(--color-border-error)]"
          : tone === "success"
            ? "border-[var(--color-border-success)]"
            : "border-border",
      ].join(" ")}
    >
      <span
        aria-hidden
        className={[
          "inline-flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-lg",
          tone === "error"
            ? "bg-bg-error-subtle text-text-error"
            : tone === "success"
              ? "bg-bg-success-subtle text-text-success"
              : "bg-bg-subtle text-text-secondary",
        ].join(" ")}
      >
        {isDone ? <CheckGlyph /> : isFailed ? <AlertGlyph /> : <InfoGlyph />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-text-tertiary">{kicker}</p>
        <p className="truncate text-md font-semibold text-text-primary">{title}</p>
      </div>
      {action && (
        <button
          type="button"
          onClick={action.run}
          className={`inline-flex h-[32px] shrink-0 items-center rounded-lg border border-solid border-border bg-bg-surface px-[12px] text-sm font-semibold text-text-primary outline-none transition-colors duration-fast hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus ${tap}`}
        >
          {action.label}
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label={`Hide — ${title}`}
        className={`inline-flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-lg text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-surface-raised hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus ${tap} max-md:w-[var(--touch-min)] [@media(pointer:coarse)]:w-[var(--touch-min)]`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}

function InfoGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="7" r="2" />
      <rect x="10.4" y="11" width="3.2" height="9.5" rx="1.4" />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4 10-10" />
    </svg>
  );
}

function AlertGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <rect x="10.4" y="3" width="3.2" height="12" rx="1.4" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  );
}
