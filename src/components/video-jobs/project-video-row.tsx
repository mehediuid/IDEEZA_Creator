"use client";

// The project video's row (owner, 2026-10-21; docs/superpowers/specs/2026-10-21-project-video-design.md,
// "Rows and copy"), under its own "Project video" group wherever the product video rows are: the
// readiness dialog (with its action) and the mint's Review step (read-only).
// - A 2×2 mosaic of the products' posters (or concept images), dimmed while it waits, each
//   product with a ready video at full strength.
// - The project's name, then `projectRowCopy`'s status with its icon (never colour alone), the
//   progress while it renders, and the note or failure under it.
// - While it waits it says why, with no button and nothing greyed. Once it can be made (or
//   updated) the list turns solid violet and the row gets a one-time highlight; focus never moves.

import * as React from "react";
import { Image01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, ProgressBar } from "@/components/ideeza";
import type { ProjectVideoStatus } from "@/lib/video/project-video";
import type { ProductVideoStatus } from "@/lib/video/types";
import { projectActionLabel, projectRowCopy } from "@/lib/video/video-copy";
import { cn } from "@/lib/utils";
import { StatusGlyph, useClipUrl } from "./video-player";

/** A current product as the mosaic draws it: its in-use poster, else its concept image. */
export type ProjectRowProduct = { productId: string; thumb: string | null; video: ProductVideoStatus };

const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
/** How long the "you can make it now" highlight holds before it fades. */
const CUE_MS = 1200;

/** The row can be acted on now: the list draws solid violet. */
function isLive(status: ProjectVideoStatus): boolean {
  const action = projectRowCopy(status).action;
  return action === "make" || action === "update";
}

/** The project video group's list: dashed while there's nothing to do, solid violet once it can be made. */
export function ProjectVideoList({ status, children }: { status: ProjectVideoStatus; children: React.ReactNode }) {
  return (
    <ul
      role="list"
      className={cn(
        "m-0 flex list-none flex-col overflow-hidden rounded-lg border p-0 transition-colors duration-normal ease-decelerate motion-reduce:transition-none",
        isLive(status) ? "border-solid border-border-brand" : "border-dashed border-border-strong",
      )}
    >
      {children}
    </ul>
  );
}

export function ProjectVideoRow({
  status,
  projectName,
  products,
  variant = "dialog",
  onAction,
  actionRef,
}: {
  status: ProjectVideoStatus;
  projectName: string;
  /** The current products, in order. */
  products: ProjectRowProduct[];
  /** "dialog": the readiness dialog's row; "review": the Review step's compact, read-only row. */
  variant?: "dialog" | "review";
  /** The owner's action (Make / Update / Try again). Without it the row is read-only. */
  onAction?: () => void;
  actionRef?: (el: HTMLButtonElement | null) => void;
}) {
  const copy = projectRowCopy(status);
  const label = onAction ? projectActionLabel(copy.action) : null;
  const dim = status.state === "waiting" || (status.state === "outdated" && copy.action === null);

  // A one-time highlight when the row turns actionable — never on first draw, never a focus move.
  const [shownAction, setShownAction] = React.useState(copy.action);
  const [cue, setCue] = React.useState(false);
  if (shownAction !== copy.action) {
    setShownAction(copy.action);
    if (copy.action === "make" || copy.action === "update") setCue(true);
  }
  React.useEffect(() => {
    if (!cue) return;
    const t = window.setTimeout(() => setCue(false), CUE_MS);
    return () => window.clearTimeout(t);
  }, [cue]);

  const review = variant === "review";
  const progressLabel = `${projectName} project video`;
  return (
    <li
      className={cn(
        "transition-colors duration-normal ease-decelerate motion-reduce:transition-none",
        cue && "motion-safe:bg-bg-brand-subtle",
        review ? "flex flex-col gap-[8px] px-[14px] py-[10px]" : "flex flex-wrap items-center gap-x-6 gap-y-4 px-6 py-5",
      )}
    >
      <div className={cn("flex min-w-0 flex-1 items-center", review ? "min-h-[44px] gap-[12px]" : "gap-x-6")}>
        <Mosaic products={products} dim={dim} />
        <span className={cn("flex min-w-0 flex-1 flex-col", review ? "gap-[2px]" : "gap-1")}>
          <span className="truncate text-md font-semibold text-text-primary">{projectName}</span>
          <span className={cn("flex items-center gap-2 text-text-secondary", review ? "text-sm" : "text-md")}>
            <StatusGlyph icon={copy.icon} tone={copy.tone} size={14} />
            <span>{copy.text}</span>
          </span>
          {!review && copy.progress !== null && <ProgressBar value={copy.progress} label={progressLabel} className="mt-1 max-w-[240px]" />}
          {copy.sub && (
            <span className="flex items-center gap-2 text-sm text-text-tertiary">
              {copy.action === "updateNote" && <StatusGlyph icon="info" tone="neutral" size={14} />}
              <span>{copy.sub}</span>
            </span>
          )}
        </span>
      </div>
      {review && copy.progress !== null && <ProgressBar value={copy.progress} label={progressLabel} />}
      {label && onAction && (
        <Button
          ref={actionRef}
          type="button"
          hierarchy="secondary"
          size="md"
          aria-haspopup="dialog"
          className={cn("max-sm:w-full motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-normal", TAP)}
          onClick={(e) => {
            // Safari doesn't focus a clicked button; the dialog on top returns focus here.
            e.currentTarget.focus();
            onAction();
          }}
        >
          {label}
        </Button>
      )}
    </li>
  );
}

/** Up to four products' pictures, 2×2 (one product fills it). 44 px, like the product rows. */
function Mosaic({ products, dim }: { products: ProjectRowProduct[]; dim: boolean }) {
  const shown = products.slice(0, 4);
  if (shown.length <= 1) {
    return (
      <span aria-hidden className="relative inline-flex size-[44px] shrink-0 overflow-hidden rounded-lg bg-bg-surface-raised">
        {shown[0] ? <Cell product={shown[0]} faded={dim && shown[0].video.state !== "ready"} /> : <Empty />}
      </span>
    );
  }
  return (
    <span aria-hidden className="grid size-[44px] shrink-0 grid-cols-2 grid-rows-2 gap-1 overflow-hidden rounded-lg">
      {shown.map((p) => (
        <Cell key={p.productId} product={p} faded={dim && p.video.state !== "ready"} />
      ))}
      {Array.from({ length: 4 - shown.length }, (_, i) => (
        <span key={i} className="block bg-bg-surface-raised" />
      ))}
    </span>
  );
}

function Cell({ product, faded }: { product: ProjectRowProduct; faded: boolean }) {
  return (
    <span className={cn("relative block h-full w-full overflow-hidden bg-bg-surface-raised", faded && "opacity-40")}>
      <VideoThumb takeId={product.video.state === "ready" ? product.video.take.id : null} image={product.thumb} />
    </span>
  );
}

function Empty() {
  return (
    <span className="absolute inset-0 flex items-center justify-center text-text-tertiary">
      <Icon icon={Image01Icon} size={18} />
    </span>
  );
}

/** A take's poster, else the image, else a neutral icon — filling its box. */
export function VideoThumb({ takeId, image }: { takeId: string | null; image: string | null }) {
  const clip = useClipUrl(takeId);
  const [broken, setBroken] = React.useState(false);
  const src = clip.state === "ready" ? clip.posterUrl : !broken ? image : null;
  if (!src) return <Empty />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" onError={() => setBroken(true)} />;
}
