"use client";

// An event's page, /events/<slug> — Figma IDEEZA Website V-2, "Event for Join
// Waitlist- Details Page" (18542:25207 hackathon · 18542:27423 launch ·
// 18542:61172 National Tour, a version per tab) and its "Single Image Viewer"
// (18542:64379).
//
// - Header: title (Display/MD) and the story (Body/XL Medium, 794 wide), 28
//   apart, 32 under them.
// - The National Tour: the DS M14 Tabs (toggle style — bg/subtle track, the
//   chosen tab on bg/surface with a border/subtle ring and a light shadow,
//   others in text/tertiary), one per university, 48 above its photos.
// - Photos: a row, 20 apart, 460 tall — the chosen photo 655 wide, the rest
//   181.667 (border/strong ring, radius 14, faded to the page colour). The
//   arrow pills under it (glass/border-subtle, 59 × 48, 32 apart) or a click
//   on a narrow photo choose the next one; a click on the chosen photo opens
//   the viewer. Below lg the row is one swipe strip of equal photos and a tap
//   opens the viewer.
// - Viewer: the page under the DS modal scrim with an 84 px blur, the photo
//   in the 20-radius lilac frame (1236 × 718 at 1440), the arrow pills at its
//   foot. Esc or a click outside closes it; ← → move. A Close button (not in
//   the Figma) is added so touch and keyboard users always have a way out.
//
// Two small additions to the Figma: "All events" above the title (the top bar
// has no Events link) and the Close button.

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon, ArrowRight02Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import type { EventPhoto, IdeezaEvent } from "./data";

const PILL =
  "flex h-[48px] w-[59px] shrink-0 items-center justify-center rounded-[64px] border-0 bg-[var(--color-glass-border-subtle)] px-[24px] py-[8px] text-[color:var(--color-white)] transition-colors duration-fast ease-standard hover:bg-[var(--color-glass-highlight)] focus-visible:outline-none focus-visible:shadow-focus-brand disabled:cursor-default disabled:opacity-40";
const FADE = "pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_44.568%,var(--color-bg-page)_107.21%)]";

function Arrows({ onPrev, onNext, label, className }: { onPrev: () => void; onNext: () => void; label: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-16", className)}>
      <button type="button" onClick={onPrev} aria-label={`Previous ${label}`} className={PILL}>
        <HugeiconsIcon icon={ArrowLeft02Icon} size={28} color="currentColor" strokeWidth={1.5} />
      </button>
      <button type="button" onClick={onNext} aria-label={`Next ${label}`} className={PILL}>
        <HugeiconsIcon icon={ArrowRight02Icon} size={28} color="currentColor" strokeWidth={1.5} />
      </button>
    </div>
  );
}

/** The photo strip: one wide chosen photo, the rest narrow (lg); a swipe strip below lg. */
function Gallery({ photos, onOpen }: { photos: EventPhoto[]; onOpen: (i: number) => void }) {
  const [active, setActive] = React.useState(0);
  const strip = React.useRef<HTMLUListElement>(null);
  const n = photos.length;

  // Keep the chosen photo in view: the strip scrolls so it starts at the left
  // edge, or as far as the strip goes.
  React.useEffect(() => {
    const ul = strip.current;
    const li = ul?.children.item(active) as HTMLElement | null;
    if (!ul || !li) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    ul.scrollTo({ left: li.offsetLeft - ul.offsetLeft, behavior: reduce ? "auto" : "smooth" });
  }, [active]);

  const go = (step: number) => setActive((i) => (i + step + n) % n);

  return (
    <div className="flex flex-col gap-16">
      <ul
        ref={strip}
        className="m-0 -mx-8 flex snap-x snap-mandatory scroll-px-8 list-none gap-[20px] overflow-x-auto px-8 pb-2 [scrollbar-width:none] lg:mx-0 lg:snap-none lg:overflow-hidden lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((p, i) => {
          const on = i === active;
          return (
            <li
              key={p.src}
              className={cn(
                "w-[82%] shrink-0 snap-start transition-[width] duration-normal ease-standard motion-reduce:transition-none sm:w-[46%]",
                on ? "lg:w-[655px]" : "lg:w-[181.667px]",
              )}
            >
              <button
                type="button"
                onClick={() => (on || window.matchMedia("(max-width: 1023px)").matches ? onOpen(i) : setActive(i))}
                aria-label={on ? `Open ${p.alt}` : `Show ${p.alt}`}
                aria-current={on ? "true" : undefined}
                className="relative block h-[300px] w-full overflow-hidden rounded-[14px] border-solid border border-[var(--color-border-strong)] bg-[var(--color-bg-surface)] p-0 focus-visible:outline-none focus-visible:shadow-focus-brand md:h-[380px] lg:h-[460px]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.src} alt="" loading={i < 4 ? "eager" : "lazy"} className="absolute inset-0 block size-full object-cover" />
                <span aria-hidden className={FADE} />
              </button>
            </li>
          );
        })}
      </ul>
      {n > 1 ? <Arrows onPrev={() => go(-1)} onNext={() => go(1)} label="photo" className="hidden justify-end lg:flex" /> : null}
    </div>
  );
}

/** The single-photo viewer (Figma 18542:64379). */
function Viewer({ photos, start, onClose }: { photos: EventPhoto[]; start: number; onClose: () => void }) {
  const [i, setI] = React.useState(start);
  const close = React.useRef<HTMLButtonElement>(null);
  const n = photos.length;
  const go = React.useCallback((step: number) => setI((v) => (v + step + n) % n), [n]);

  React.useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      before?.focus();
    };
  }, [go, onClose]);

  const p = photos[i];
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={p.alt}
      data-theme="dark"
      className="fixed inset-0 z-modal flex items-center justify-center bg-[var(--color-modal-scrim)] px-8 py-24 backdrop-blur-[84px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Figma 18632:48493 — the frame, 1260 × 742 at 1440. */}
      <div className="relative w-full max-w-[1260px] rounded-[20px] border-solid border border-[rgba(210,197,252,0.2)] p-[12px]">
        <div className="relative flex aspect-[4/3] max-h-[calc(100dvh-120px)] w-full flex-col items-center justify-end overflow-hidden rounded-[14px] border-solid border border-[var(--color-border-strong)] p-12 md:aspect-[1236/718] md:p-16">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={p.src} src={p.src} alt={p.alt} className="absolute inset-0 block size-full object-cover" />
          <span aria-hidden className={FADE} />
          {n > 1 ? <Arrows onPrev={() => go(-1)} onNext={() => go(1)} label="photo" className="relative" /> : null}
          <p aria-live="polite" className="sr-only">
            Photo {i + 1} of {n}
          </p>
        </div>
        <button ref={close} type="button" onClick={onClose} aria-label="Close" className={cn(PILL, "absolute right-[28px] top-[28px] w-[48px] px-0 md:right-[36px] md:top-[36px]")}>
          <HugeiconsIcon icon={Cancel01Icon} size={22} color="currentColor" strokeWidth={1.5} />
        </button>
      </div>
    </div>,
    document.body,
  );
}

/** The DS M14 Tabs, toggle style (Figma 18542:62109): one tab per stop. */
function StopTabs({ stops, value, onChange }: { stops: NonNullable<IdeezaEvent["stops"]>; value: number; onChange: (i: number) => void }) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const move = (to: number) => {
    const next = (to + stops.length) % stops.length;
    onChange(next);
    refs.current[next]?.focus();
  };
  return (
    <div
      role="tablist"
      aria-label="Universities"
      className="flex w-full gap-2 rounded-xl bg-[var(--color-bg-subtle)] p-2"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") move(value + 1);
        else if (e.key === "ArrowLeft") move(value - 1);
        else if (e.key === "Home") move(0);
        else if (e.key === "End") move(stops.length - 1);
        else return;
        e.preventDefault();
      }}
    >
      {stops.map((s, i) => {
        const on = i === value;
        return (
          <button
            key={s.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${s.id}`}
            aria-selected={on}
            aria-controls={`panel-${s.id}`}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(i)}
            className={cn(
              "flex min-w-0 flex-1 items-center justify-center rounded-lg border border-solid px-[14px] py-[8px] font-display text-lg font-medium leading-lg tracking-normal transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:shadow-focus-brand lg:min-w-0",
              on
                ? "border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-[color:var(--color-text-primary)] shadow-1"
                : "border-transparent bg-transparent text-[color:var(--color-text-tertiary)] hover:text-[color:var(--color-text-secondary)]",
            )}
          >
            <span aria-hidden className="truncate lg:hidden">{s.short}</span>
            <span className="sr-only lg:not-sr-only lg:truncate">{s.name}</span>
          </button>
        );
      })}
    </div>
  );
}

export function EventDetail({ event }: { event: IdeezaEvent }) {
  const [stop, setStop] = React.useState(0);
  const [open, setOpen] = React.useState<number | null>(null);
  const photos = event.stops ? event.stops[stop].photos : (event.photos ?? []);
  const current = event.stops?.[stop];

  return (
    <section aria-labelledby="event-title" className="relative bg-[var(--color-bg-page)]">
      <div className="relative mx-auto flex w-full max-w-[1260px] flex-col gap-16 px-8 pb-40 pt-[120px] md:pt-[160px] xl:px-0 xl:pb-[148px] xl:pt-[156px]">
        <Link
          href="/events"
          className="inline-flex w-fit items-center gap-4 rounded-full font-display text-md font-medium leading-md text-[color:var(--color-text-tertiary)] transition-colors duration-fast ease-standard hover:text-[color:var(--color-text-primary)] focus-visible:outline-none focus-visible:shadow-focus-brand"
        >
          <HugeiconsIcon icon={ArrowLeft02Icon} size={16} color="currentColor" strokeWidth={1.5} />
          All events
        </Link>

        {/* Figma 18542:62104 — title and story, 28 apart, 32 under them. */}
        <div className="flex max-w-[794px] flex-col gap-[28px] pb-16 font-display">
          <h1
            id="event-title"
            className="text-5xl font-semibold leading-5xl tracking-close text-[color:var(--color-text-primary)] xl:text-6xl xl:leading-6xl xl:tracking-snug"
          >
            {event.title}
          </h1>
          <p className="text-xl font-medium leading-2xl tracking-normal text-[color:var(--color-text-secondary)] xl:text-2xl xl:leading-[30px]">
            {event.description}
          </p>
        </div>

        <div className="flex flex-col gap-24">
          {event.stops ? <StopTabs stops={event.stops} value={stop} onChange={setStop} /> : null}
          <div
            role={current ? "tabpanel" : undefined}
            id={current ? `panel-${current.id}` : undefined}
            aria-labelledby={current ? `tab-${current.id}` : undefined}
          >
            <Gallery key={current?.id ?? event.slug} photos={photos} onOpen={setOpen} />
          </div>
        </div>
      </div>

      {open !== null ? <Viewer photos={photos} start={open} onClose={() => setOpen(null)} /> : null}
    </section>
  );
}
