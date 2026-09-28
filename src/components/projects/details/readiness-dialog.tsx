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
//   again opens the Generate dialog on top, with ← Back to this one.
// - Everything is live: a render that finishes turns its row ready and
//   enables the CTA without a reload. A screen-reader-only status says state
//   changes ("Rider video is ready."), never progress ticks.
// - Showcase only, while ownership isn't confirmed: "I confirm I am the
//   rightful owner of this idea". Ticking it writes `ownerConfirmedAt`.
// - While something here blocks, the CTA is aria-disabled but focusable,
//   with the reason under it; pressing it then moves focus to the first
//   row's action, or to the checkbox.

import * as React from "react";
import { Image01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner, Button, Checkbox, ModalFrame, ProgressBar } from "@/components/ideeza";
import { GenerateVideoDialog, videoTargetOf, type VideoTarget } from "@/components/video-jobs/generate-video-dialog";
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
  actionLabel,
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
  /** A caller's own rows after the products (LISTING's metadata row on a relist). */
  extra?: React.ReactNode;
  onPass: () => void;
  onClose: () => void;
};

const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

/** What this dialog can fix, so what its CTA waits on: the videos (every
 *  purpose — they're the rows here) and any rule marked fixed in the gate. */
export function dialogBlockerOf(readiness: Readiness): string | null {
  return readiness.rules.find((r) => !r.ok && (r.fixedIn === "gate" || r.id === "videos"))?.reason ?? null;
}

export function ReadinessDialog({ purpose, project: given, view, brief, product, extra, onPass, onClose }: ReadinessDialogProps) {
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

  const [generating, setGenerating] = React.useState<VideoTarget | null>(null);
  const actionRefs = React.useRef(new Map<string, HTMLButtonElement>());
  const boxRef = React.useRef<HTMLButtonElement>(null);
  const hintId = React.useId();
  const headingId = React.useId();

  // State changes only, said once each (never the progress ticks).
  const stateKey = readiness.products.map((p) => `${p.productId}:${p.video.state}`).join("|");
  const [seen, setSeen] = React.useState(stateKey);
  const [said, setSaid] = React.useState("");
  const [lastStates, setLastStates] = React.useState(() => new Map(readiness.products.map((p) => [p.productId, p.video.state])));
  if (seen !== stateKey) {
    const lines: string[] = [];
    for (const p of readiness.products) {
      if (lastStates.get(p.productId) !== p.video.state) {
        const line = stateChangeLine(displayProductName(p.name), p.video);
        if (line) lines.push(line);
      }
    }
    setSeen(stateKey);
    setLastStates(new Map(readiness.products.map((p) => [p.productId, p.video.state])));
    if (lines.length) setSaid(lines.join(" "));
  }

  const productById = React.useMemo(() => new Map(view.products.map((p) => [p.id, p])), [view.products]);
  const openGenerate = (productId: string) => {
    const p = productById.get(productId) ?? (product?.id === productId ? product : undefined);
    if (p) setGenerating(videoTargetOf(project, p));
  };

  const pressCta = () => {
    if (!blocker) {
      onPass();
      return;
    }
    const firstAction = readiness.products
      .map((p) => actionRefs.current.get(p.productId))
      .find((el): el is HTMLButtonElement => !!el);
    (firstAction ?? (askedOwnership && !owned ? boxRef.current : null))?.focus();
  };

  return (
    <>
      <ModalFrame
        open
        onClose={onClose}
        covered={generating !== null}
        size="md"
        title={copy.title}
        footer={
          <div className="ml-auto flex flex-col items-end gap-2">
            <div className="flex flex-wrap items-center justify-end gap-6">
              <Button type="button" hierarchy="secondary" size="lg" className={TAP} onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="button"
                hierarchy="primary"
                size="lg"
                aria-disabled={blocker ? true : undefined}
                aria-describedby={blocker ? hintId : undefined}
                className={cn(TAP, "aria-disabled:cursor-not-allowed aria-disabled:opacity-60")}
                onClick={pressCta}
              >
                {copy.cta}
              </Button>
            </div>
            {blocker && (
              <p id={hintId} className="text-right text-sm text-text-secondary">
                {blocker}
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
                  onAction={() => openGenerate(p.productId)}
                />
              ))}
            </ul>
          </section>

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
                "flex min-h-[32px] items-center gap-[10px] self-start rounded-md px-[4px] text-left text-sm font-medium text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus aria-disabled:cursor-default",
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
        target={generating}
        back={{ label: `Back to ${copy.title}`, onBack: () => setGenerating(null) }}
        onClose={() => setGenerating(null)}
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
        <span className="truncate text-sm font-semibold text-text-primary">{name}</span>
        <span className="flex items-center gap-2 text-sm text-text-secondary">
          <StatusGlyph icon={copy.icon} tone={copy.tone} size={14} />
          <span>{copy.text}</span>
        </span>
        {copy.progress !== null && <ProgressBar value={copy.progress} label={`${name} video`} className="mt-1 max-w-[240px]" />}
        {copy.sub && <span className="text-xs text-text-tertiary">{copy.sub}</span>}
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
