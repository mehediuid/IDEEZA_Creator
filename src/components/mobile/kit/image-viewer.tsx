"use client";

// The one full-screen image viewer of /m (Messages MS-22 10679:7070; also
// Project media 03b and Product media): a dark ground in both themes, the
// status bar in its media look, a top bar with ✕ and "n of N", the image
// fitted to the width with its caption under it, and a foot of ← · the
// action · →. The buttons keep their light look on the dark ground, as the
// Figma draws them. ← and → stop at the ends; a swipe and the arrow keys move
// too; Escape and ✕ close.
//
// The caller owns the pictures (a blob from this phone, a build's concept
// image): it passes the current one and is told where to move.
//
//   <ImageViewer open={at !== null} onClose={() => setAt(null)}
//     index={at ?? 0} count={photos.length} onIndex={setAt}
//     src={url} alt={photo.name} caption={photo.name}
//     save={url ? { href: url, name: photo.name } : undefined} />
//
// `save` draws "Save photo" (MS-22); `action` puts anything else in its place
// (Project media's "Use as cover"); `note` is a line under the caption (the
// photo is gone from this phone, a refused cover). It is a layer like a sheet:
// the app behind is inert, a sheet opened from it draws its own scrim, and a
// toast stands above its foot.

import * as React from "react";
import { createPortal } from "react-dom";
import { ArrowLeft02Icon, ArrowRight02Icon, Cancel01Icon, Download04Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, buttonVariants } from "@/components/ideeza/button";
import { IconButton } from "@/components/ideeza/icon-button";
import { useDialogFocus } from "@/components/create/use-dialog-focus";
import { cn } from "@/lib/utils";
import { HomeIndicator } from "../home-indicator";
import { StatusBar } from "../status-bar";
import { T } from "../type";
import { MEDIA_GROUND, MEDIA_INK } from "./media";
import { PRESSED_SECONDARY } from "./press";
import { useLayer } from "./sheet";
import { FOOT_ATTR, LAYER_ATTR } from "./toast";

/** The viewer's buttons: light on the dark ground in both themes. */
const LIGHT = { "data-theme": "light" } as const;

export type ImageViewerProps = {
  open: boolean;
  onClose: () => void;
  /** Which picture is showing, from 0, and how many there are. */
  index: number;
  count: number;
  onIndex: (index: number) => void;
  /** The picture; null while it loads or when it is gone (say why in `note`). */
  src: string | null;
  alt: string;
  caption?: React.ReactNode;
  note?: React.ReactNode;
  /** "Save photo": downloads the picture under this name; null draws it off (the picture isn't here yet). */
  save?: { href: string; name: string } | null;
  /** In place of Save photo, between ← and → (one XL button, `className="flex-1"`). */
  action?: React.ReactNode;
  /** What a picture is called here: "Photo 2 of 5". */
  noun?: string;
};

export function ImageViewer(props: ImageViewerProps) {
  const { open, onClose, index, count, onIndex, src, alt, caption, note, save, action, noun = "Photo" } = props;
  const panel = React.useRef<HTMLDivElement>(null);
  const swipe = React.useRef<number | null>(null);
  useLayer(open, onClose, true);
  useDialogFocus(open, panel);

  const go = React.useCallback(
    (d: 1 | -1) => {
      const next = index + d;
      if (next >= 0 && next < count) onIndex(next);
    },
    [index, count, onIndex],
  );

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, go]);

  if (!open) return null;
  const lower = noun.toLowerCase();
  return createPortal(
    <div
      ref={panel}
      role="dialog"
      aria-modal="true"
      aria-label={`${noun} ${index + 1} of ${count}`}
      {...{ [LAYER_ATTR]: "" }}
      className={cn("fixed inset-0 z-sheet flex flex-col font-sans motion-safe:animate-in motion-safe:fade-in motion-safe:duration-normal", MEDIA_GROUND, MEDIA_INK)}
    >
      <StatusBar tone="media" />
      <header className="flex h-[56px] shrink-0 items-center justify-between gap-4 px-8">
        <span {...LIGHT}>
          <IconButton hierarchy="secondary" size="xl" aria-label="Close" className={PRESSED_SECONDARY} icon={<Icon icon={Cancel01Icon} size={22} />} onClick={onClose} />
        </span>
        <p className={cn(T.bodyStrong, MEDIA_INK, "tabular-nums")} aria-live="polite">
          {index + 1} of {count}
        </p>
        <span className="w-[44px]" aria-hidden />
      </header>
      <div
        className="flex min-h-0 flex-1 touch-pan-y flex-col items-center justify-center gap-6"
        onPointerDown={(e) => {
          swipe.current = e.clientX;
        }}
        onPointerUp={(e) => {
          if (swipe.current === null) return;
          const dx = e.clientX - swipe.current;
          swipe.current = null;
          if (Math.abs(dx) > 48) go(dx < 0 ? 1 : -1);
        }}
        onPointerCancel={() => {
          swipe.current = null;
        }}
      >
        {src && (
          // A blob or a build's image: next/image can't optimise it.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt} draggable={false} className="min-h-0 max-h-full w-full select-none object-contain" />
        )}
        {caption != null && <p className={cn(T.body, MEDIA_INK, "max-w-full shrink-0 truncate px-8")}>{caption}</p>}
        {note != null && <p className={cn(T.body, MEDIA_INK, "shrink-0 px-8 text-center")}>{note}</p>}
      </div>
      <footer {...LIGHT} {...{ [FOOT_ATTR]: "" }} className="flex shrink-0 items-center gap-6 px-8 pb-4 pt-8">
        <IconButton
          hierarchy="secondary"
          size="xl"
          className={PRESSED_SECONDARY}
          aria-label={`Previous ${lower}`}
          disabled={index <= 0}
          icon={<Icon icon={ArrowLeft02Icon} size={22} />}
          onClick={() => go(-1)}
        />
        {action ??
          (save ? (
            <a href={save.href} download={save.name} className={cn(buttonVariants({ hierarchy: "secondary", size: "xl" }), "flex-1")}>
              <Icon icon={Download04Icon} size={20} />
              Save photo
            </a>
          ) : save === null ? (
            <Button hierarchy="secondary" size="xl" className="flex-1" disabled>
              Save photo
            </Button>
          ) : (
            <span className="flex-1" />
          ))}
        <IconButton
          hierarchy="secondary"
          size="xl"
          className={PRESSED_SECONDARY}
          aria-label={`Next ${lower}`}
          disabled={index >= count - 1}
          icon={<Icon icon={ArrowRight02Icon} size={22} />}
          onClick={() => go(1)}
        />
      </footer>
      <HomeIndicator tone="media" />
    </div>,
    document.body,
  );
}
