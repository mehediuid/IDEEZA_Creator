"use client";

// VideoLightbox — the Media tab's ready videos, one at a time (Phase 2 VIDEO
// P2-VIDEO-10, following CNT-18's rules for the image lightbox):
// - the player contain-fits within 90vw × 85vh, and never autoplays — each
//   item mounts a fresh player on its poster and Play button;
// - "{i} of {n} · {Product}";
// - ←/→ move between the group's ready videos, but only while focus is NOT
//   inside the <video>, which uses the arrow keys to seek;
// - × and Esc close, and focus returns to the tile that opened it;
// - no Desktop / Mobile toggle;
// - the owner also gets "Open {Product}", the product page.
// It renders through a portal over the page and keeps the keyboard the way
// every dialog does (useDialogFocus).

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowLeft01Icon, ArrowRight01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { useDialogFocus } from "@/components/create/use-dialog-focus";
import { linkVariants } from "@/components/ideeza";
import type { VideoTake } from "@/lib/video/types";
import { cn } from "@/lib/utils";
import { VideoPlayer } from "./video-player";

export type LightboxVideo = {
  take: VideoTake;
  productName: string;
  /** The product page; the link shows for the owner only. */
  productHref: string | null;
};

// Round controls on the dark scrim in both themes: white glyphs, a faint wash on hover.
const ROUND =
  "z-10 inline-flex h-[var(--touch-min)] w-[var(--touch-min)] items-center justify-center rounded-lg text-text-on-brand outline-none transition-colors duration-normal ease-decelerate hover:bg-[color-mix(in_srgb,var(--color-text-on-brand)_10%,transparent)] focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none";

export function VideoLightbox({
  items,
  index,
  projectId,
  onIndexChange,
  onClose,
}: {
  items: LightboxVideo[];
  index: number;
  projectId: string;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const item = items[index];
  useDialogFocus(true, dialogRef, closeRef);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      // The <video> seeks with these keys; the lightbox leaves them to it.
      if (e.defaultPrevented || document.activeElement instanceof HTMLVideoElement) return;
      if (e.key === "ArrowLeft" && index > 0) onIndexChange(index - 1);
      else if (e.key === "ArrowRight" && index < items.length - 1) onIndexChange(index + 1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [index, items.length, onClose, onIndexChange]);

  if (!item || typeof document === "undefined") return null;
  const caption = `${index + 1} of ${items.length} · ${item.productName}`;

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${item.productName} video`}
      onClick={onClose}
      className="fixed inset-0 z-modal flex flex-col items-center justify-center gap-4 px-4 py-6"
    >
      <div aria-hidden className="absolute inset-0 bg-[color-mix(in_srgb,var(--color-bg-overlay)_62%,transparent)] backdrop-blur-sm" />

      <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className={`absolute right-4 top-4 ${ROUND}`}>
        <Icon icon={Cancel01Icon} size={22} />
      </button>
      {index > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onIndexChange(index - 1);
          }}
          aria-label="Previous video"
          className={`absolute left-4 top-1/2 -translate-y-1/2 ${ROUND}`}
        >
          <Icon icon={ArrowLeft01Icon} size={22} />
        </button>
      )}
      {index < items.length - 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onIndexChange(index + 1);
          }}
          aria-label="Next video"
          className={`absolute right-4 top-1/2 -translate-y-1/2 ${ROUND}`}
        >
          <Icon icon={ArrowRight01Icon} size={22} />
        </button>
      )}

      {/* The player sits on a surface so its meta and transcript read in both themes. */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[85vh] w-[min(90vw,calc((85vh-200px)*16/9))] min-w-[min(90vw,280px)] overflow-y-auto rounded-2xl border border-solid border-border bg-bg-surface p-6 shadow-3"
      >
        <VideoPlayer key={item.take.id} take={item.take} productName={item.productName} projectId={projectId} />
      </div>

      <div onClick={(e) => e.stopPropagation()} className="relative z-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        <p className="text-sm text-text-on-brand">{caption}</p>
        {item.productHref && (
          <Link
            href={item.productHref}
            className={cn(
              linkVariants({ color: "neutral", size: "md" }),
              "text-text-on-brand underline underline-offset-2 max-md:min-h-[var(--touch-min)] max-md:inline-flex max-md:items-center",
            )}
          >
            Open {item.productName}
          </Link>
        )}
      </div>
    </div>,
    document.body,
  );
}
