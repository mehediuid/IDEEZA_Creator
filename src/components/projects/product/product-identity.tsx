"use client";

// The product page's identity row (COR-31): the concept image, the frozen
// concept description (H-7), the part-changes line (owner only), and the
// labelled facts from the booked snapshot — the build-lock rule's numbers,
// never the chat's later answer. Read-only: nothing here edits a thing.

import * as React from "react";
import { bookedSpec, specOfSource } from "@/lib/create/build-artifacts";
import type { BuildProduct } from "@/lib/create/history";
import { productFacts } from "@/lib/manual/products-tab-view";
import { cn } from "@/lib/utils";

export function ProductIdentity({
  product,
  name,
  description,
  version,
  partChanges,
}: {
  /** This product inside the build of the version on screen. */
  product: BuildProduct;
  name: string;
  /** The concept's description, frozen before any edit (H-7). */
  description: string;
  version: number;
  /** "added HC-SR04 ultrasonic sensor" — null when nothing changed, the
   *  chat is gone, or the viewer isn't the owner (PPL-7). */
  partChanges: string | null;
}) {
  // The card's own facts (COR-23), from this version's booked snapshot. A
  // build that predates spec booking has them worked out from its parts (H-8).
  const facts = productFacts(specOfSource(product), product.parts);
  const worked = !bookedSpec(product);
  const image = product.conceptImageUrl;
  return (
    <section
      aria-label="About this product"
      className={cn(
        "grid gap-8",
        image && "[@container(min-width:640px)]:grid-cols-[240px_minmax(0,1fr)] [@container(min-width:640px)]:gap-12",
      )}
    >
      {image ? (
        <ConceptImage
          key={image}
          src={image}
          alt={`${name} concept image, v${version}`}
          className="aspect-[16/10] w-full [@container(min-width:640px)]:aspect-[4/3]"
        />
      ) : null}
      <div className="flex min-w-0 flex-col gap-6">
        {description ? <ClampedText text={description} /> : null}
        {partChanges ? (
          <p className="max-w-[68ch] text-md leading-relaxed text-text-secondary">
            Built with your part changes: {partChanges}
          </p>
        ) : null}
        <dl className="grid w-fit grid-cols-[max-content_minmax(0,1fr)] gap-x-10 gap-y-3 text-md">
          {facts.map((f) => (
            <React.Fragment key={f.label}>
              <dt className="text-text-secondary">{f.label}</dt>
              <dd className="min-w-0 break-words text-text-primary">{f.value}</dd>
            </React.Fragment>
          ))}
        </dl>
        {worked ? (
          <p className="text-sm text-text-tertiary">
            These facts are worked out from the parts — this build has no booked spec.
          </p>
        ) : null}
      </div>
    </section>
  );
}

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
function ClampedText({ text }: { text: string }) {
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
        className={cn("max-w-[68ch] text-md leading-relaxed text-text-primary", !open && "line-clamp-3")}
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
