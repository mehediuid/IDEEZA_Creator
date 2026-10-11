"use client";

// The product page's identity pieces (COR-31): the concept image and the
// frozen concept description (H-7), clamped. The header places them (owner,
// 2026-10-11: a thumbnail beside the name, the description under it); the
// labelled facts and the part changes are the rail's Specs block
// (product-facts.tsx). Read-only: nothing here edits a thing.

import * as React from "react";
import { cn } from "@/lib/utils";

/** A concept image in a reserved box, loaded lazily. A failed load says so
 *  on the placeholder rather than leaving a blank frame (COR-23). Keyed by
 *  `src` at the call site, so a new image starts from "loading" again. */
export function ConceptImage({ src, alt, className }: { src: string; alt: string; className: string }) {
  const [failed, setFailed] = React.useState(false);
  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-border bg-bg-subtle", className)}>
      {failed ? (
        <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-text-secondary">
          Image didn&apos;t load
        </p>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="block h-full w-full object-cover"
        />
      )}
    </div>
  );
}

/** Three lines, then "Show more" — only when the text really runs past them,
 *  measured by a ResizeObserver (its first callback is the first measure). */
export function ClampedText({ text }: { text: string }) {
  const id = React.useId();
  const ref = React.useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = React.useState(false);
  const [clips, setClips] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || open) return;
    const ro = new ResizeObserver(() => setClips(el.scrollHeight > el.clientHeight + 1));
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, open]);
  return (
    <div className="flex flex-col items-start gap-2">
      <p
        id={id}
        ref={ref}
        className={cn("max-w-[68ch] text-md leading-relaxed text-text-secondary", !open && "line-clamp-3")}
      >
        {text}
      </p>
      {clips || open ? (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
          className="min-h-[24px] rounded-sm text-sm font-semibold text-text-link outline-none transition-colors duration-normal ease-decelerate hover:text-text-link-hover focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none"
        >
          {open ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}
