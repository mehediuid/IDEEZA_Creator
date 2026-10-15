"use client";

// The thumbnail picker (Figma frames 14–19, 23–25), used by the publish modal
// and by Change thumbnail. With no image: "Include a high quality 400×267
// pixels image in your blog" and Upload (owner decision D-8). With one: the 3:2
// frame, − / + on the image, and "Drag or use arrow keys to reposition image"
// over it until the writer first moves it (keys and buttons too, so it is never
// drag-only — WCAG 2.5.7); under it "Select thumbnail one of your images" (D-7),
// a strip that scrolls with arrows, and Upload (Upload new when the blog has no
// images of its own).
//
// The picture stays under the pointer while it is dragged (lib/blog/cover.ts
// maps the drag to what can really move); the frame is redrawn directly while
// dragging and the move is kept on release. Keys and − / + say what they did,
// politely. An uploaded thumbnail is a choice like any other: it joins the
// strip, also on reopening, and its size warning reads the stored file. A blog
// with no images of its own shows no strip (frame 15). On touch, a swipe that
// can't move the picture up or down scrolls the sheet instead.

import * as React from "react";
import { Add01Icon, ArrowLeft01Icon, ArrowRight01Icon, Image01Icon, Move01Icon, Remove01Icon, Upload04Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, Banner, Button, IconButton, Spinner } from "@/components/ideeza";
import { BlogImage, CoverImage } from "@/components/blog/cover-image";
import {
  coverFrom,
  cropWarning,
  overflowOf,
  panCover,
  stepCover,
  visiblyMoved,
  zoomCover,
  zoomWords,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
  type Size,
} from "@/lib/blog/cover";
import { useBlogFileUrl } from "@/lib/blog/files";
import { storeImage } from "@/lib/blog/image";
import { IMAGE_TYPES } from "@/lib/blog/media";
import type { BlogCover, BlogImageAttrs } from "@/lib/blog/types";
import { cn } from "@/lib/utils";

type Candidate = { fileKey: string; alt: string; width: number; height: number; label: string };

/** P3, the Figma's words (D-7). */
export const STRIP_LABEL = "Select thumbnail one of your images";

/** The pills over the image: the overlay scrim, see-through so the photo shows, with the
 *  toast's white ink — dark on any photo in both themes, as the Figma draws them. */
const ON_IMAGE = "bg-[color-mix(in_srgb,var(--color-bg-overlay)_64%,transparent)] text-[color:var(--color-text-on-toast)]";
/** 44 px on phones and on any touch screen (a tablet included). */
const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
const TAP_SQUARE = "max-md:!size-[var(--touch-min)] [@media(pointer:coarse)]:!size-[var(--touch-min)]";
const NO_SIZE: Size = { width: 0, height: 0 };

/** The stored image's own size, read from the blob itself (what the thumbnail is cut from). */
function useStoredSize(fileKey: string | null): Size | null {
  const { url } = useBlogFileUrl(fileKey);
  const [size, setSize] = React.useState<{ url: string; size: Size } | null>(null);
  React.useEffect(() => {
    if (!url) return;
    let live = true;
    const img = new Image();
    img.onload = () => {
      if (live) setSize({ url, size: { width: img.naturalWidth, height: img.naturalHeight } });
    };
    img.src = url;
    return () => {
      live = false;
    };
  }, [url]);
  return size && size.url === url ? size.size : null;
}

/** An element's size, kept current (a callback ref, so a frame that comes and goes is followed). */
function useBoxSize(): [Size, (el: HTMLElement | null) => void] {
  const [size, setSize] = React.useState<Size>(NO_SIZE);
  const ro = React.useRef<ResizeObserver | null>(null);
  const ref = React.useCallback((el: HTMLElement | null) => {
    ro.current?.disconnect();
    ro.current = null;
    if (!el) return;
    // Layout size, not the on-screen box: the dialog opens with a brief zoom-in that a
    // ResizeObserver never reports, and a drag is measured once it has settled.
    const read = () => {
      const width = el.offsetWidth;
      const height = el.offsetHeight;
      setSize((s) => (s.width === width && s.height === height ? s : { width, height }));
    };
    read();
    if (typeof ResizeObserver === "undefined") return;
    ro.current = new ResizeObserver(read);
    ro.current.observe(el);
  }, []);
  return [size, ref];
}

/** A strip that scrolls sideways, with an arrow at each end that has more to show. */
function Strip({ label, children, count }: { label: string; children: React.ReactNode; count: number }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [ends, setEnds] = React.useState({ left: false, right: false });
  const measure = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // The strip's own padding (room for the focus ring) counts as the end, so › hides at the last image.
    const style = getComputedStyle(el);
    const padL = parseFloat(style.paddingLeft) || 0;
    const padR = parseFloat(style.paddingRight) || 0;
    const left = el.scrollLeft > padL + 1;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - padR - 1;
    setEnds((e) => (e.left === left && e.right === right ? e : { left, right }));
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
  // New images (an upload) change what there is to scroll to, without any resize.
  React.useLayoutEffect(measure, [measure, count]);
  const go = (dir: -1 | 1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };
  const arrow = cn("absolute top-1/2 -translate-y-1/2 rounded-full border-solid shadow-2", TAP_SQUARE);
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
  badge,
}: {
  articleId: string;
  value: BlogCover | null;
  onChange: (c: BlogCover | null) => void;
  /** The blog's own images, in reading order. */
  images: readonly BlogImageAttrs[];
  idPrefix: string;
  /** "Thumbnail" over the picker; off where the dialog's own title says it. */
  showLegend?: boolean;
  /** A word on the frame about the image shown (Change thumbnail: "Waiting for review"). */
  badge?: string | null;
}) {
  const [uploaded, setUploaded] = React.useState<Candidate[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [moved, setMoved] = React.useState(false);
  const [said, setSaid] = React.useState("");
  const [focusFrame, setFocusFrame] = React.useState(false);
  const [frame, measureFrame] = useBoxSize();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const frameRef = React.useRef<HTMLDivElement | null>(null);
  const drag = React.useRef<{ x: number; y: number; start: BlogCover; now: BlogCover } | null>(null);
  const setFrameRef = React.useCallback(
    (el: HTMLDivElement | null) => {
      frameRef.current = el;
      measureFrame(el);
    },
    [measureFrame],
  );

  const candidates: Candidate[] = React.useMemo(() => {
    const own = images.map((i, n) => ({ fileKey: i.fileKey, alt: i.alt, width: i.width, height: i.height, label: i.alt || `Image ${n + 1} in your blog` }));
    const extra = uploaded.filter((u) => !own.some((o) => o.fileKey === u.fileKey));
    // A thumbnail uploaded before (not one of the blog's images) is still a choice on reopening.
    const kept =
      value && !own.some((o) => o.fileKey === value.fileKey) && !extra.some((u) => u.fileKey === value.fileKey)
        ? [{ fileKey: value.fileKey, alt: value.alt, width: 0, height: 0, label: "Your uploaded thumbnail" }]
        : [];
    return [...own, ...extra, ...kept];
  }, [images, uploaded, value]);

  const current = value ? candidates.find((c) => c.fileKey === value.fileKey) : undefined;
  const stored = useStoredSize(value?.fileKey ?? null);
  const natural: Size | null = stored ?? (current && current.width && current.height ? { width: current.width, height: current.height } : null);
  const warning = value && natural ? cropWarning(natural, value.zoom) : null;

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

  // After an upload the keyboard lands on the new picture's frame, so the next arrow key moves it,
  // and the strip shows the new image chosen.
  React.useEffect(() => {
    if (!focusFrame || !frameRef.current) return;
    frameRef.current.focus();
    if (value) document.getElementById(`${idPrefix}-cover-${value.fileKey}`)?.scrollIntoView({ block: "nearest", inline: "nearest" });
    setFocusFrame(false);
  }, [focusFrame, value, idPrefix]);

  const say = (text: string) => {
    setSaid("");
    requestAnimationFrame(() => setSaid(text));
  };

  const pick = (c: Candidate) => {
    setError(null);
    onChange(value?.fileKey === c.fileKey ? value : coverFrom(c.fileKey, c.alt));
  };

  const upload = async (file: File | undefined) => {
    if (!file || busy) return;
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
    setMoved(false);
    onChange(coverFrom(c.fileKey, ""));
    setFocusFrame(true);
    say(`${file.name} is the thumbnail now.`);
  };

  const zoom = (dir: -1 | 1) => {
    if (!value) return;
    const next = zoomCover(value, value.zoom + dir * ZOOM_STEP);
    if (next.zoom !== value.zoom) {
      setMoved(true);
      onChange(next);
    }
    say(zoomWords(next.zoom));
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!value || !e.key.startsWith("Arrow") || e.target !== e.currentTarget) return;
    e.preventDefault();
    const step = stepCover(value, e.key, e.shiftKey, frame, natural);
    if (step.cover !== value) {
      setMoved(true);
      onChange(step.cover);
    }
    say(step.said);
  };

  // The drag redraws the picture directly (no re-render per move) and keeps the crop on release.
  const draw = (c: BlogCover) => {
    const img = frameRef.current?.querySelector("img");
    if (!img) return;
    img.style.objectPosition = `${c.x}% ${c.y}%`;
    img.style.transformOrigin = `${c.x}% ${c.y}%`;
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if (!value) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, start: value, now: value };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const next = panCover(d.start, e.clientX - d.x, e.clientY - d.y, frame, natural);
    if (next === d.now) return;
    d.now = next;
    draw(next);
  };
  const endDrag = () => {
    const d = drag.current;
    drag.current = null;
    if (!d || !visiblyMoved(d.start, d.now, frame, natural)) return;
    setMoved(true);
    onChange(d.now);
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
  const atMin = !!value && value.zoom <= ZOOM_MIN;
  const atMax = !!value && value.zoom >= ZOOM_MAX;
  const zoomBtn = cn(
    "inline-flex size-[32px] cursor-pointer items-center justify-center rounded-md border-0 bg-transparent p-0 text-[color:var(--color-text-on-toast)] outline-none hover:bg-[color-mix(in_srgb,var(--color-bg-overlay)_48%,transparent)] focus-visible:ring-2 focus-visible:ring-border-focus aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:bg-transparent",
    "max-md:size-[var(--touch-min)] [@media(pointer:coarse)]:size-[var(--touch-min)]",
  );
  // The pointer on − / + is theirs, not the start of a drag.
  const own = (e: React.PointerEvent) => e.stopPropagation();
  // On touch, a swipe the picture can't follow up or down scrolls the sheet instead (audit F27).
  const fixedUpDown = !!value && overflowOf(frame, natural, value.zoom).height <= 0.5;
  const showStrip = images.length > 0 && candidates.length > 0;

  const uploadButton = (label: string, className?: string) => (
    <Button
      type="button"
      hierarchy="secondary"
      size="md"
      // Busy, it stays focusable (aria-disabled, not disabled), so the keyboard isn't dropped.
      aria-disabled={busy || undefined}
      aria-busy={busy || undefined}
      className={cn(TAP, "aria-disabled:cursor-progress", className)}
      iconTrailing={busy ? <Spinner size={16} /> : <Icon icon={Upload04Icon} size={16} />}
      onClick={() => {
        if (!busy) fileRef.current?.click();
      }}
    >
      {label}
    </Button>
  );

  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-6 border-0 p-0">
      <legend className={cn("mb-6 p-0 text-md font-semibold leading-md text-text-primary", !showLegend && "sr-only")}>Thumbnail</legend>

      {value ? (
        <div
          ref={setFrameRef}
          tabIndex={0}
          role="group"
          aria-label="Thumbnail position"
          aria-describedby={hintId}
          onKeyDown={onKey}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className={cn(
            "relative cursor-grab select-none overflow-hidden rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 active:cursor-grabbing",
            fixedUpDown ? "touch-pan-y" : "touch-none",
          )}
        >
          <CoverImage cover={value} decorative />
          {badge && (
            <span className="absolute left-6 top-6">
              <Badge tone="warning">{badge}</Badge>
            </span>
          )}
          <div className={cn("absolute right-6 top-6 flex items-center gap-1 rounded-lg p-1", ON_IMAGE)}>
            <button type="button" aria-label="Zoom out" aria-disabled={atMin || undefined} className={zoomBtn} onPointerDown={own} onClick={() => zoom(-1)}>
              <Icon icon={Remove01Icon} size={20} />
            </button>
            <button type="button" aria-label="Zoom in" aria-disabled={atMax || undefined} className={zoomBtn} onPointerDown={own} onClick={() => zoom(1)}>
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
          <p className="m-0 text-md leading-md text-text-secondary">Include a high quality 400×267 pixels image in your blog</p>
          {uploadButton("Upload")}
        </div>
      )}
      {warning && <Banner tone="attention">{warning}</Banner>}

      {showStrip && (
        <div className="flex min-w-0 flex-col gap-4">
          <p aria-hidden className="m-0 text-md leading-md text-text-primary">
            {STRIP_LABEL}
          </p>
          <Strip label={STRIP_LABEL} count={candidates.length}>
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
                  <BlogImage fileKey={c.fileKey} alt="" thumb className="size-full object-cover" />
                </button>
              );
            })}
          </Strip>
        </div>
      )}

      {value && uploadButton(images.length > 0 ? "Upload" : "Upload new", "w-full")}
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
      <span className="sr-only" aria-live="polite">
        {said}
      </span>
    </fieldset>
  );
}
