"use client";

// ReadinessDialog — "every product needs an AI video" (Phase 2 VIDEO
// P2-VIDEO-14 as changed in spec §4.3; Figma 41505:154279, 154747). One
// dialog for Showcase, Sell, Give, Relist and a single Edition, exported for
// MARKET, LISTING and MINT. Callers open it only when `readinessOf` fails
// for their purpose; its CTA calls `onPass` once nothing it can fix blocks.
//
// - One row per current product (or the one edition product): the in-use
//   poster, else the concept image, else a neutral icon; the name; the
//   P2-VIDEO-4 status; and the owner's action — Generate AI video / Try
//   again / Review opens the Generate dialog on top (Review on the waiting
//   take's Review), with ← Back to this one.
// - Every whole-project purpose (not an edition) adds the "Project video"
//   group under the products (owner, 2026-10-21): one row, made from the
//   product videos. It waits, with its reason, until every product has its
//   video; then Make project video (or Update / Try again) opens the Project
//   video dialog on top, with ← Back, and the CTA waits for it too.
// - Everything is live: a render that finishes turns its row ready and
//   enables the CTA without a reload. A screen-reader-only status says state
//   changes ("Rider video is ready.", "All 3 product videos are ready. You can
//   make the project video now."), never progress ticks.
// - Showcase only, while ownership isn't confirmed: "I confirm I am the
//   rightful owner of this idea". Ticking it writes `ownerConfirmedAt`.
// - While something here blocks, the CTA is aria-disabled but focusable,
//   with the reason under it; pressing it then moves focus to the first
//   row's action, or to the checkbox.
// - Closing is safe (owner, 2026-10-21): the footer says Close, and while a
//   video renders a note under the rows says the render keeps going.

import * as React from "react";
import { Image01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner, Button, Checkbox, ModalFrame, ProgressBar } from "@/components/ideeza";
import { GenerateVideoDialog, videoTargetOf, type VideoTarget } from "@/components/video-jobs/generate-video-dialog";
import { ProjectVideoDialog } from "@/components/video-jobs/project-video-dialog";
import { ProjectVideoList, ProjectVideoRow } from "@/components/video-jobs/project-video-row";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";
import { StatusGlyph, useClipUrl } from "@/components/video-jobs/video-player";
import type { StoredDraft } from "@/lib/brief/project-brief";
import type { ProductReadiness, Readiness, ReadinessPurpose } from "@/lib/manual/p2-types";
import type { ProjectProduct, ProjectView } from "@/lib/manual/project-read";
import { displayProductName } from "@/lib/manual/products-tab-view";
import { useManualProjects, type ManualProject } from "@/lib/manual/projects";
import { readinessFactsOf, readinessOf } from "@/lib/manual/readiness";
import { useProjectVideos } from "@/lib/video/store";
import {
  PROJECT_GROUP_META,
  PROJECT_VIDEO_TITLE,
  actionLabel,
  projectStateLine,
  readinessCopy,
  readyCountLine,
  stateChangeLine,
  statusCopy,
} from "@/lib/video/video-copy";
import { cn } from "@/lib/utils";

export type ReadinessDialogProps = {
  purpose: ReadinessPurpose;
  project: ManualProject;
  view: ProjectView;
  brief: StoredDraft | null;
  /** The product an `edition` gate is about (P2-VIDEO-13 C: edition reads one product). */
  product?: ProjectProduct;
  /** A caller's own rows after the products (LISTING's metadata row on a relist; the share's story and status). */
  extra?: React.ReactNode;
  /** Why the caller's own rows hold the CTA, once nothing here does; pressing then calls `onExtraBlocked`. */
  extraBlocker?: string | null;
  onExtraBlocked?: () => void;
  onPass: () => void;
  onClose: () => void;
};

const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

/** What this dialog can fix, so what its CTA waits on: the videos and the
 *  project video (every purpose — they're the rows here) and any rule marked
 *  fixed in the gate. */
export function dialogBlockerOf(readiness: Readiness): string | null {
  return (
    readiness.rules.find((r) => !r.ok && (r.fixedIn === "gate" || r.id === "videos" || r.id === "projectVideo"))?.reason ??
    null
  );
}

export function ReadinessDialog({
  purpose,
  project: given,
  view,
  brief,
  product,
  extra,
  extraBlocker = null,
  onExtraBlocked,
  onPass,
  onClose,
}: ReadinessDialogProps) {
  const { projects, setOwnerConfirmed } = useManualProjects();
  // The live record: ticking the box writes to it, and the rule reads it back.
  const project = projects.find((p) => p.id === given.id) ?? given;
  const { record } = useProjectVideos(project.id);
  const { jobs, now } = useVideoJobs();

  const readiness = React.useMemo(() => {
    const facts = readinessFactsOf(project, view, brief, record, jobs, now);
    return readinessOf(purpose === "edition" ? { ...facts, product } : facts, purpose);
  }, [project, view, brief, record, jobs, now, purpose, product]);

  const copy = readinessCopy(purpose, product ? displayProductName(product.name) : undefined);
  const blocker = dialogBlockerOf(readiness);
  const ownershipRule = readiness.rules.find((r) => r.id === "ownership");
  // Shown while ownership fails at the Showcase gate, and kept (ticked) once
  // it's confirmed here, so the box doesn't vanish from under the maker.
  const [askedOwnership] = React.useState(() => purpose === "showcase" && ownershipRule?.ok === false);
  const owned = ownershipRule?.ok === true;

  const [generating, setGenerating] = React.useState<{ target: VideoTarget; reviewTakeId: string | null } | null>(null);
  const [projecting, setProjecting] = React.useState(false);
  const actionRefs = React.useRef(new Map<string, HTMLButtonElement>());
  const projectActionRef = React.useRef<HTMLButtonElement | null>(null);
  const boxRef = React.useRef<HTMLButtonElement>(null);
  const hintId = React.useId();
  const headingId = React.useId();
  const projectHeadingId = React.useId();
  const projectVideo = readiness.project;

  // State changes only, said once each (never the progress ticks). The project row's key is its
  // state and whether it can be updated, so "you can update it now" is said once too.
  const projectKey = projectVideo ? `${projectVideo.state}:${projectVideo.ready === projectVideo.total}` : "";
  const stateKey = `${readiness.products.map((p) => `${p.productId}:${p.video.state}`).join("|")}#${projectKey}`;
  const [seen, setSeen] = React.useState(stateKey);
  const [said, setSaid] = React.useState("");
  const [lastStates, setLastStates] = React.useState(() => new Map(readiness.products.map((p) => [p.productId, p.video.state])));
  const [lastProject, setLastProject] = React.useState(projectKey);
  if (seen !== stateKey) {
    const lines: string[] = [];
    for (const p of readiness.products) {
      if (lastStates.get(p.productId) !== p.video.state) {
        const line = stateChangeLine(displayProductName(p.name), p.video);
        if (line) lines.push(line);
      }
    }
    if (projectVideo && lastProject !== projectKey) {
      const line = projectStateLine(projectVideo, readiness.counts.total);
      if (line) lines.push(line);
    }
    setSeen(stateKey);
    setLastStates(new Map(readiness.products.map((p) => [p.productId, p.video.state])));
    setLastProject(projectKey);
    if (lines.length) setSaid(lines.join(" "));
  }

  const productById = React.useMemo(() => new Map(view.products.map((p) => [p.id, p])), [view.products]);
  const openGenerate = (row: ProductReadiness) => {
    const p = productById.get(row.productId) ?? (product?.id === row.productId ? product : undefined);
    const v = row.video;
    const waiting = v.state === "review" ? v.take : v.state === "ready" ? v.review : undefined;
    if (p) setGenerating({ target: videoTargetOf(project, p), reviewTakeId: waiting?.id ?? null });
  };
  // Something renders: closing this is safe, and the note says so.
  const rendering =
    readiness.products.some((p) => p.video.state === "rendering" || (p.video.state === "ready" && !!p.video.next)) ||
    projectVideo?.state === "rendering";

  const pressCta = () => {
    if (!blocker && extraBlocker) {
      onExtraBlocked?.();
      return;
    }
    if (!blocker) {
      onPass();
      return;
    }
    const firstAction =
      readiness.products.map((p) => actionRefs.current.get(p.productId)).find((el): el is HTMLButtonElement => !!el) ??
      projectActionRef.current;
    (firstAction ?? (askedOwnership && !owned ? boxRef.current : null))?.focus();
  };

  return (
    <>
      <ModalFrame
        open
        onClose={onClose}
        covered={generating !== null || projecting}
        size="md"
        title={copy.title}
        footer={
          <div className="ml-auto flex flex-col items-end gap-2">
            <div className="flex flex-wrap items-center justify-end gap-6">
              <Button type="button" hierarchy="secondary" size="lg" className={TAP} onClick={onClose}>
                Close
              </Button>
              <Button
                type="button"
                hierarchy="primary"
                size="lg"
                aria-disabled={blocker || extraBlocker ? true : undefined}
                aria-describedby={blocker || extraBlocker ? hintId : undefined}
                className={cn(TAP, "aria-disabled:cursor-not-allowed aria-disabled:opacity-60")}
                onClick={pressCta}
              >
                {copy.cta}
              </Button>
            </div>
            {(blocker || extraBlocker) && (
              <p id={hintId} className="text-right text-sm text-text-secondary">
                {blocker ?? extraBlocker}
              </p>
            )}
          </div>
        }
      >
        <div className="flex flex-col gap-8">
          <Banner tone="info">{copy.info}</Banner>

          <section aria-labelledby={headingId} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <h3 id={headingId} className="text-md font-semibold text-text-primary">
                Products
              </h3>
              <span className="text-sm text-text-secondary">
                {readyCountLine(readiness.counts.ready, readiness.counts.total)}
              </span>
            </div>
            <ul role="list" className="flex flex-col divide-y divide-border rounded-lg border border-solid border-border">
              {readiness.products.map((p) => (
                <ReadinessRow
                  key={p.productId}
                  row={p}
                  actionRef={(el) => {
                    if (el) actionRefs.current.set(p.productId, el);
                    else actionRefs.current.delete(p.productId);
                  }}
                  onAction={() => openGenerate(p)}
                />
              ))}
            </ul>
          </section>

          {projectVideo && (
            <section aria-labelledby={projectHeadingId} className="flex flex-col gap-4">
              <div className="flex flex-wrap items-baseline justify-between gap-4">
                <h3 id={projectHeadingId} className="text-md font-semibold text-text-primary">
                  {PROJECT_VIDEO_TITLE}
                </h3>
                <span className="text-sm text-text-secondary">{PROJECT_GROUP_META}</span>
              </div>
              <ProjectVideoList status={projectVideo}>
                <ProjectVideoRow
                  status={projectVideo}
                  projectName={project.name}
                  products={readiness.products}
                  actionRef={(el) => {
                    projectActionRef.current = el;
                  }}
                  onAction={() => setProjecting(true)}
                />
              </ProjectVideoList>
            </section>
          )}

          {rendering && (
            <p className="flex items-start gap-3 rounded-lg bg-bg-surface-raised px-6 py-4 text-sm text-text-secondary">
              <span className="mt-[2px]">
                <StatusGlyph icon="info" tone="brand" size={16} />
              </span>
              Renders keep going if you close this. Their progress shows on the Review step and in the corner.
            </p>
          )}

          {askedOwnership && (
            <button
              ref={boxRef}
              type="button"
              role="checkbox"
              aria-checked={owned}
              aria-disabled={owned || undefined}
              onClick={() => {
                if (!owned) setOwnerConfirmed(project.id, Date.now());
              }}
              className={cn(
                "flex min-h-[32px] items-center gap-[10px] self-start rounded-md px-[4px] text-left text-md font-medium text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus aria-disabled:cursor-default",
                TAP,
              )}
            >
              <Checkbox checked={owned} decorative />I confirm I am the rightful owner of this idea
            </button>
          )}

          {extra}

          <p role="status" aria-live="polite" className="sr-only">
            {said}
          </p>
        </div>
      </ModalFrame>

      <GenerateVideoDialog
        open={generating !== null}
        target={generating?.target ?? null}
        reviewTakeId={generating?.reviewTakeId ?? null}
        back={{ label: `Back to ${copy.title}`, onBack: () => setGenerating(null) }}
        onClose={() => setGenerating(null)}
      />
      <ProjectVideoDialog
        open={projecting}
        project={project}
        products={view.products}
        back={{ label: `Back to ${copy.title}`, onBack: () => setProjecting(false) }}
        onClose={() => setProjecting(false)}
      />
    </>
  );
}

function ReadinessRow({
  row,
  actionRef,
  onAction,
}: {
  row: ProductReadiness;
  actionRef: (el: HTMLButtonElement | null) => void;
  onAction: () => void;
}) {
  const name = displayProductName(row.name);
  const copy = statusCopy(row.video);
  const action = actionLabel(copy.action);
  return (
    <li className="flex flex-wrap items-center gap-x-6 gap-y-4 px-6 py-5">
      <RowThumb row={row} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-md font-semibold text-text-primary">{name}</span>
        <span className="flex items-center gap-2 text-md text-text-secondary">
          <StatusGlyph icon={copy.icon} tone={copy.tone} size={14} />
          <span>{copy.text}</span>
        </span>
        {copy.progress !== null && <ProgressBar value={copy.progress} label={`${name} video`} className="mt-1 max-w-[240px]" />}
        {copy.sub && <span className="text-sm text-text-tertiary">{copy.sub}</span>}
      </div>
      {action && (
        <Button
          ref={actionRef}
          type="button"
          hierarchy="secondary"
          size="md"
          className={cn("max-sm:w-full", TAP)}
          onClick={(e) => {
            // Safari doesn't focus a clicked button; the gate returns focus here.
            e.currentTarget.focus();
            onAction();
          }}
        >
          {action}
        </Button>
      )}
    </li>
  );
}

/** The in-use poster, else the concept image, else a neutral icon (44 px). */
function RowThumb({ row }: { row: ProductReadiness }) {
  const inUse = row.video.state === "ready" ? row.video.take.id : null;
  const clip = useClipUrl(inUse);
  const [broken, setBroken] = React.useState(false);
  const src = clip.state === "ready" ? clip.posterUrl : !broken ? row.thumb : null;
  return (
    <span aria-hidden className="relative inline-flex size-[44px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-bg-surface-raised text-text-tertiary">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" onError={() => setBroken(true)} />
      ) : (
        <Icon icon={Image01Icon} size={18} />
      )}
    </span>
  );
}
