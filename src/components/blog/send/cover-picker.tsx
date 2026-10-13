"use client";

// The cover picker (spec § Send dialog; mockup Editor.dc.html): a 3:2 frame the
// writer can drag, move with the arrow keys or zoom with buttons (WCAG 2.5.7 —
// never drag-only), "Center image", the article's own images to choose from,
// an upload, and the cover's description. Used by the Send dialog and by
// Change cover.

import * as React from "react";
import { Add01Icon, Remove01Icon, Upload04Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner, Button, IconButton, Slider, TextInput } from "@/components/ideeza";
import { BlogImage, CoverImage } from "@/components/blog/cover-image";
import { centerCover, coverFrom, dragCover, nudgeCover, zoomCover, ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from "@/lib/blog/cover";
import { storeImage } from "@/lib/blog/image";
import { IMAGE_TYPES, smallCoverWarning } from "@/lib/blog/media";
import type { BlogCover, BlogImageAttrs } from "@/lib/blog/types";
import { cn } from "@/lib/utils";

type Candidate = { fileKey: string; alt: string; width: number; height: number; label: string };

export function CoverPicker({
  articleId,
  value,
  onChange,
  images,
  idPrefix,
}: {
  articleId: string;
  value: BlogCover | null;
  onChange: (c: BlogCover | null) => void;
  /** The article's own images, in reading order. */
  images: readonly BlogImageAttrs[];
  idPrefix: string;
}) {
  const [uploaded, setUploaded] = React.useState<Candidate[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const frameRef = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef<{ x: number; y: number; start: BlogCover } | null>(null);

  const candidates: Candidate[] = React.useMemo(() => {
    const own = images.map((i, n) => ({ fileKey: i.fileKey, alt: i.alt, width: i.width, height: i.height, label: i.alt || `Image ${n + 1} in your article` }));
    const extra = uploaded.filter((u) => !own.some((o) => o.fileKey === u.fileKey));
    return [...own, ...extra];
  }, [images, uploaded]);

  const current = value ? candidates.find((c) => c.fileKey === value.fileKey) : undefined;
  const warning = current && current.width && current.height ? smallCoverWarning(current.width, current.height) : null;

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
    if (!value || !e.key.startsWith("Arrow")) return;
    e.preventDefault();
    onChange(nudgeCover(value, e.key, e.shiftKey));
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
    onChange(dragCover(d.start, e.clientX - d.x, e.clientY - d.y, box.width, box.height));
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
  };

  const hintId = `${idPrefix}-cover-hint`;

  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-5 border-0 p-0">
      <legend className="mb-2 p-0 text-md font-semibold leading-md text-text-primary">Cover image</legend>
      <p className="m-0 -mt-2 text-sm leading-sm text-text-secondary">Shown on cards and at the top of your article.</p>

      {value ? (
        <div
          ref={frameRef}
          tabIndex={0}
          role="group"
          aria-label="Cover position"
          aria-describedby={hintId}
          onKeyDown={onKey}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="relative cursor-grab touch-none select-none overflow-hidden rounded-xl border border-solid border-border-strong outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 active:cursor-grabbing"
        >
          <CoverImage cover={value} decorative />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex aspect-[3/2] w-full flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border-strong bg-bg-subtle text-md leading-md text-text-secondary outline-none hover:border-border-brand focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <Icon icon={Upload04Icon} size={24} />
          Add a cover image
          <span className="text-sm leading-sm text-text-tertiary">JPG, PNG, WebP or GIF · best at 1200 × 800 px</span>
        </button>
      )}

      {value && (
        <div className="flex flex-wrap items-center gap-4">
          <IconButton
            hierarchy="secondary"
            size="md"
            aria-label="Zoom out"
            icon={<Icon icon={Remove01Icon} size={18} />}
            disabled={value.zoom <= ZOOM_MIN}
            onClick={() => onChange(zoomCover(value, value.zoom - ZOOM_STEP))}
          />
          <Slider
            className="min-w-[120px] flex-1"
            value={value.zoom}
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step={ZOOM_STEP}
            aria-label="Zoom"
            valueLabel={(v) => `${Math.round(v * 100)}%`}
            onValueChange={(v) => onChange(zoomCover(value, v))}
          />
          <IconButton
            hierarchy="secondary"
            size="md"
            aria-label="Zoom in"
            icon={<Icon icon={Add01Icon} size={18} />}
            disabled={value.zoom >= ZOOM_MAX}
            onClick={() => onChange(zoomCover(value, value.zoom + ZOOM_STEP))}
          />
          <Button type="button" hierarchy="ghost" size="md" onClick={() => onChange(centerCover(value))}>
            Center image
          </Button>
        </div>
      )}
      {value && (
        <p id={hintId} className="m-0 text-sm leading-sm text-text-secondary">
          Drag to move the image, or use the arrow keys (Shift for bigger steps).
        </p>
      )}
      {warning && <Banner tone="attention">{warning}</Banner>}

      <div className="flex flex-wrap items-center gap-4">
        {candidates.length > 0 && (
          <div role="radiogroup" aria-label="Pick a cover" className="flex flex-wrap gap-4">
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
                    "relative aspect-[3/2] w-[72px] overflow-hidden rounded-md border-solid bg-bg-subtle p-0 outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 max-md:w-[88px]",
                    on ? "border-2 border-border-brand" : "border border-border",
                  )}
                >
                  <BlogImage fileKey={c.fileKey} alt="" className="size-full object-cover" />
                </button>
              );
            })}
          </div>
        )}
        <Button type="button" hierarchy="secondary" size="md" loading={busy} iconLeading={<Icon icon={Upload04Icon} size={16} />} onClick={() => fileRef.current?.click()}>
          Upload image
        </Button>
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
      </div>
      {error && (
        <p role="alert" className="m-0 text-sm leading-sm text-text-error">
          {error}
        </p>
      )}

      {value && (
        <label className="flex flex-col gap-2">
          <span className="text-md font-medium leading-md text-text-primary">Cover description</span>
          <TextInput
            id={`${idPrefix}-cover-alt`}
            value={value.alt}
            maxLength={300}
            placeholder="e.g. The finished lamp board on a desk"
            onValueChange={(alt) => onChange({ ...value, alt })}
            aria-describedby={`${idPrefix}-cover-alt-hint`}
          />
          <span id={`${idPrefix}-cover-alt-hint`} className="text-sm leading-sm text-text-secondary">
            Helps people who can&apos;t see the image.
          </span>
        </label>
      )}
    </fieldset>
  );
}
