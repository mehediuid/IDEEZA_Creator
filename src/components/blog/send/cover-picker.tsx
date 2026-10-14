"use client";

// The thumbnail picker (Figma frames 14–19, 23–25), used by the publish modal
// and by Change thumbnail. With no image: "Include a high-quality image in your
// blog" and Upload. With one: the 3:2 frame, − / + on the image, and "Drag or
// use arrow keys to reposition image" over it until the writer first moves it
// (keys and buttons too, so it is never drag-only — WCAG 2.5.7); under it
// "Select a thumbnail from your images", a strip that scrolls with arrows, and
// Upload (Upload new when the blog has no images of its own).

import * as React from "react";
import { Add01Icon, ArrowLeft01Icon, ArrowRight01Icon, Image01Icon, Move01Icon, Remove01Icon, Upload04Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner, Button, IconButton } from "@/components/ideeza";
import { BlogImage, CoverImage } from "@/components/blog/cover-image";
import { coverFrom, dragCover, nudgeCover, zoomCover, ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from "@/lib/blog/cover";
import { storeImage } from "@/lib/blog/image";
import { COVER_MIN, IMAGE_TYPES, smallCoverWarning } from "@/lib/blog/media";
import type { BlogCover, BlogImageAttrs } from "@/lib/blog/types";
import { cn } from "@/lib/utils";

type Candidate = { fileKey: string; alt: string; width: number; height: number; label: string };

/** The pills over the image: the overlay scrim, see-through so the photo shows, with the
 *  toast's white ink — dark on any photo in both themes, as the Figma draws them. */
const ON_IMAGE = "bg-[color-mix(in_srgb,var(--color-bg-overlay)_64%,transparent)] text-[color:var(--color-text-on-toast)]";
const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

/** A strip that scrolls sideways, with an arrow at each end that has more to show. */
function Strip({ label, children }: { label: string; children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [ends, setEnds] = React.useState({ left: false, right: false });
  const measure = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEnds({ left: el.scrollLeft > 1, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1 });
  }, []);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);
  const go = (dir: -1 | 1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };
  const arrow = "absolute top-1/2 -translate-y-1/2 rounded-full shadow-2 max-md:!size-[var(--touch-min)]";
  return (
    <div className="relative min-w-0">
      <div ref={ref} role="radiogroup" aria-label={label} onScroll={measure} className="relative flex gap-4 overflow-x-auto scroll-smooth p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
      {/* Pointer help only: the keyboard moves through the images with the arrow keys. */}
      {ends.left && (
        <IconButton
          type="button"
          tabIndex={-1}
          hierarchy="secondary"
          size="sm"
          aria-label="Show earlier images"
          className={cn(arrow, "left-0")}
          icon={<Icon icon={ArrowLeft01Icon} size={16} />}
          onClick={() => go(-1)}
        />
      )}
      {ends.right && (
        <IconButton
          type="button"
          tabIndex={-1}
          hierarchy="secondary"
          size="sm"
          aria-label="Show more images"
          className={cn(arrow, "right-0")}
          icon={<Icon icon={ArrowRight01Icon} size={16} />}
          onClick={() => go(1)}
        />
      )}
    </div>
  );
}

export function CoverPicker({
  articleId,
  value,
  onChange,
  images,
  idPrefix,
  showLegend = true,
}: {
  articleId: string;
  value: BlogCover | null;
  onChange: (c: BlogCover | null) => void;
  /** The blog's own images, in reading order. */
  images: readonly BlogImageAttrs[];
  idPrefix: string;
  /** "Thumbnail" over the picker; off where the dialog's own title says it. */
  showLegend?: boolean;
}) {
  const [uploaded, setUploaded] = React.useState<Candidate[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [moved, setMoved] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const frameRef = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef<{ x: number; y: number; start: BlogCover } | null>(null);

  const candidates: Candidate[] = React.useMemo(() => {
    const own = images.map((i, n) => ({ fileKey: i.fileKey, alt: i.alt, width: i.width, height: i.height, label: i.alt || `Image ${n + 1} in your blog` }));
    const extra = uploaded.filter((u) => !own.some((o) => o.fileKey === u.fileKey));
    return [...own, ...extra];
  }, [images, uploaded]);

  const current = value ? candidates.find((c) => c.fileKey === value.fileKey) : undefined;

  // It opens on the chosen image, wherever that sits in the strip.
  const landed = React.useRef(false);
  const chosen = value?.fileKey ?? null;
  React.useEffect(() => {
    if (landed.current || !chosen) return;
    landed.current = true;
    const el = document.getElementById(`${idPrefix}-cover-${chosen}`);
    const strip = el?.parentElement;
    if (el && strip) strip.scrollLeft = el.offsetLeft - (strip.clientWidth - el.clientWidth) / 2;
  }, [chosen, idPrefix]);
  const warning = current && current.width && current.height ? smallCoverWarning(current.width, current.height) : null;

  const move = (c: BlogCover) => {
    setMoved(true);
    onChange(c);
  };

  const pick = (c: Candidate) => {
    setError(null);
    onChange(value?.fileKey === c.fileKey ? value : coverFrom(c.fileKey, c.alt));
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    const res = await storeImage(file, articleId);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    const c: Candidate = { fileKey: res.value.fileKey, alt: "", width: res.value.width, height: res.value.height, label: `Uploaded ${file.name}` };
    setUploaded((u) => [...u, c]);
    onChange(coverFrom(c.fileKey, ""));
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!value || !e.key.startsWith("Arrow") || e.target !== e.currentTarget) return;
    e.preventDefault();
    move(nudgeCover(value, e.key, e.shiftKey));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!value) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, start: value };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const box = frameRef.current?.getBoundingClientRect();
    if (!d || !box) return;
    move(dragCover(d.start, e.clientX - d.x, e.clientY - d.y, box.width, box.height));
  };
  const endDrag = () => {
    drag.current = null;
  };

  const radioKeys = (e: React.KeyboardEvent, i: number) => {
    const next = e.key === "ArrowRight" || e.key === "ArrowDown" ? i + 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? i - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const c = candidates[(next + candidates.length) % candidates.length];
    if (!c) return;
    pick(c);
    const btn = document.getElementById(`${idPrefix}-cover-${c.fileKey}`);
    btn?.focus();
    btn?.scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  const hintId = `${idPrefix}-cover-hint`;
  const zoomBtn =
    "inline-flex size-[32px] cursor-pointer items-center justify-center rounded-md border-0 bg-transparent p-0 text-[color:var(--color-text-on-toast)] outline-none hover:bg-[color-mix(in_srgb,var(--color-bg-overlay)_48%,transparent)] focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-40 max-md:size-[var(--touch-min)]";
  // The pointer on − / + is theirs, not the start of a drag.
  const own = (e: React.PointerEvent) => e.stopPropagation();

  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-6 border-0 p-0">
      <legend className={cn("mb-6 p-0 text-lg font-semibold leading-lg text-text-primary", !showLegend && "sr-only")}>Thumbnail</legend>

      {value ? (
        <div
          ref={frameRef}
          tabIndex={0}
          role="group"
          aria-label="Thumbnail position"
          aria-describedby={hintId}
          onKeyDown={onKey}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="relative cursor-grab touch-none select-none overflow-hidden rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 active:cursor-grabbing"
        >
          <CoverImage cover={value} decorative />
          <div className={cn("absolute right-6 top-6 flex items-center gap-1 rounded-lg p-1", ON_IMAGE)}>
            <button
              type="button"
              aria-label="Zoom out"
              className={zoomBtn}
              disabled={value.zoom <= ZOOM_MIN}
              onPointerDown={own}
              onClick={() => move(zoomCover(value, value.zoom - ZOOM_STEP))}
            >
              <Icon icon={Remove01Icon} size={20} />
            </button>
            <button
              type="button"
              aria-label="Zoom in"
              className={zoomBtn}
              disabled={value.zoom >= ZOOM_MAX}
              onPointerDown={own}
              onClick={() => move(zoomCover(value, value.zoom + ZOOM_STEP))}
            >
              <Icon icon={Add01Icon} size={20} />
            </button>
          </div>
          <span id={hintId} className={cn("pointer-events-none absolute inset-0 flex items-center justify-center p-8", moved && "sr-only")}>
            <span className={cn("inline-flex items-center gap-3 rounded-lg px-6 py-3 text-sm leading-sm", ON_IMAGE)}>
              <Icon icon={Move01Icon} size={16} />
              Drag or use arrow keys to reposition image
            </span>
          </span>
        </div>
      ) : (
        <div className="flex aspect-[3/2] w-full flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border-strong bg-bg-subtle p-8 text-center">
          <span aria-hidden className="inline-flex text-[color:var(--color-icon-secondary)]">
            <Icon icon={Image01Icon} size={24} />
          </span>
          <p className="text-md leading-md text-text-secondary">
            Include a high-quality image in your blog, {COVER_MIN.width} × {COVER_MIN.height} px or bigger.
          </p>
          <Button
            type="button"
            hierarchy="secondary"
            size="md"
            className={TAP}
            loading={busy}
            iconTrailing={<Icon icon={Upload04Icon} size={16} />}
            onClick={() => fileRef.current?.click()}
          >
            Upload
          </Button>
        </div>
      )}
      {warning && <Banner tone="attention">{warning}</Banner>}

      {candidates.length > 0 && (
        <div className="flex min-w-0 flex-col gap-4">
          <p className="text-md leading-md text-text-primary">Select a thumbnail from your images</p>
          <Strip label="Select a thumbnail from your images">
            {candidates.map((c, i) => {
              const on = value?.fileKey === c.fileKey;
              const focusable = on || (!value && i === 0);
              return (
                <button
                  key={c.fileKey}
                  id={`${idPrefix}-cover-${c.fileKey}`}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={c.label}
                  tabIndex={focusable ? 0 : -1}
                  onClick={() => pick(c)}
                  onKeyDown={(e) => radioKeys(e, i)}
                  className={cn(
                    "relative size-[60px] shrink-0 cursor-pointer overflow-hidden rounded-md border-solid bg-bg-subtle p-0 outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2",
                    on ? "border-2 border-border-brand" : "border border-border",
                  )}
                >
                  <BlogImage fileKey={c.fileKey} alt="" className="size-full object-cover" />
                </button>
              );
            })}
          </Strip>
        </div>
      )}

      {value && (
        <Button
          type="button"
          hierarchy="secondary"
          size="md"
          className={cn("w-full", TAP)}
          loading={busy}
          iconTrailing={<Icon icon={Upload04Icon} size={16} />}
          onClick={() => fileRef.current?.click()}
        >
          {images.length > 0 ? "Upload" : "Upload new"}
        </Button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept={IMAGE_TYPES.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          void upload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {error && (
        <p role="alert" className="m-0 text-sm leading-sm text-text-error">
          {error}
        </p>
      )}
    </fieldset>
  );
}
