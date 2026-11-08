// The Events page, /events — Figma IDEEZA Website V-2, "Event for Join
// Waitlist" (18542:22943). Left-aligned header (eyebrow, Display/LG title,
// Heading/H4 lead), 64 below it the first event as a 1260 × 602 card, then,
// 120 apart, the others as rows: title (Display/MD) and line over a
// border/default rule on the left, a 679 × 484 photo card on the right (the
// National Tour row lists its universities under the rule). Every card opens
// the event's page; "View All" with its glass pill sits on the photo.
//
// Cards follow the event card of the landing section: a 20-radius frame with
// the Figma's lilac ring, the photo at radius 14 with a color/border/strong
// ring, faded to the page colour from the middle down.
//
// Top bar and footer are the website's (landing), not the waitlist variant
// the Figma frame shows.

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { LandingEyebrow } from "@/components/landing/section-header";
import { cn } from "@/lib/utils";
import { EVENTS, type IdeezaEvent } from "./data";

const FRAME = "block rounded-[20px] border-solid border border-[rgba(210,197,252,0.2)] p-[12px] focus-visible:outline-none focus-visible:shadow-focus-brand";
const PHOTO = "relative flex flex-col justify-end overflow-hidden rounded-[14px] border-solid border border-[var(--color-border-strong)]";
const FADE = "absolute inset-0 bg-[linear-gradient(180deg,transparent_44.568%,var(--color-bg-page)_107.21%)]";

/** "View All" and its glass pill (Figma 18632:45971 / 18632:45991). */
function ViewAll({ big }: { big?: boolean }) {
  return (
    <span className="relative flex shrink-0 items-center gap-8">
      <span className="font-display text-2xl font-medium leading-[30px] tracking-normal text-[color:var(--color-text-secondary)]">View All</span>
      <span
        className={cn(
          "flex items-center justify-center rounded-[64px] bg-[var(--color-glass-highlight)] px-[24px] py-[8px] text-[color:var(--color-white)] transition-colors duration-fast ease-standard group-hover:bg-[var(--color-glass-border-subtle)]",
          big ? "h-[56px] w-[69px]" : "h-[48px] w-[59px]",
        )}
      >
        <HugeiconsIcon icon={ArrowUpRight01Icon} size={big ? 24 : 22} color="currentColor" strokeWidth={1.5} />
      </span>
    </span>
  );
}

function Featured({ e }: { e: IdeezaEvent }) {
  return (
    <Link href={`/events/${e.slug}`} aria-label={`${e.title} — view all photos`} className={cn(FRAME, "group")}>
      {/* Figma 18542:23883 — 1236 × 578, the title, its line and View All at the foot. */}
      <div className={cn(PHOTO, "h-[360px] p-12 md:h-[480px] xl:h-[578px] xl:p-16")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={e.cover} alt={e.coverAlt} width={1600} height={1067} className="absolute inset-0 block size-full object-cover" />
        <div aria-hidden className={FADE} />
        <div className="relative flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-2 font-display">
            <h2 className="text-5xl font-semibold leading-5xl tracking-close text-[color:var(--color-text-primary)] xl:text-6xl xl:leading-6xl xl:tracking-snug">
              {e.title}
            </h2>
            <p className="text-xl font-medium leading-2xl tracking-normal text-[color:var(--color-text-secondary)]">{e.line}</p>
          </div>
          <ViewAll big />
        </div>
      </div>
    </Link>
  );
}

function Row({ e }: { e: IdeezaEvent }) {
  return (
    <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:justify-between">
      {/* Figma 18542:23896 / 18542:23909 — the words, 435–444 wide. */}
      <div className="flex flex-col gap-16 lg:w-[444px] lg:shrink-0 lg:gap-[64px]">
        <div className="flex flex-col gap-2 border-0 border-b border-solid border-[var(--color-border-default)] pb-16 font-display">
          <h2 className="text-5xl font-semibold leading-5xl tracking-close text-[color:var(--color-text-primary)] xl:text-6xl xl:leading-6xl xl:tracking-snug">
            {e.title}
          </h2>
          <p className="text-xl font-medium leading-2xl tracking-normal text-[color:var(--color-text-tertiary)]">{e.line}</p>
        </div>
        {e.stops ? (
          /* Figma 18542:23914 — the tour's stops, 20 apart, a quiet rule under each but the last. */
          <ul className="m-0 flex list-none flex-col gap-10 p-0">
            {e.stops.map((s, i) => (
              <li
                key={s.id}
                className={cn(
                  "pb-10 font-display text-2xl font-medium leading-[30px] tracking-normal text-[color:var(--color-text-disabled)]",
                  i < e.stops!.length - 1 && "border-0 border-b-[0.7px] border-solid border-[var(--color-border-default)]",
                )}
              >
                {s.name}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* Figma 18542:23900 — the photo card, 679 × 484, View All at the bottom-left. */}
      <Link href={`/events/${e.slug}`} aria-label={`${e.title} — view all photos`} className={cn(FRAME, "group w-full lg:w-[679px] lg:shrink-0")}>
        <div className={cn(PHOTO, "h-[300px] p-12 md:h-[400px] lg:h-[460px]")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={e.cover} alt={e.coverAlt} width={1600} height={1067} loading="lazy" className="absolute inset-0 block size-full object-cover" />
          <div aria-hidden className={FADE} />
          <ViewAll />
        </div>
      </Link>
    </div>
  );
}

export function EventsList() {
  const [first, ...rest] = EVENTS;
  return (
    <section aria-labelledby="events-page-title" className="relative bg-[var(--color-bg-page)]">
      <div className="relative mx-auto flex w-full max-w-[1260px] flex-col gap-24 px-8 pb-40 pt-[136px] md:pt-[180px] xl:gap-[64px] xl:px-0 xl:pb-[148px] xl:pt-[208px]">
        {/* Figma 18542:23874 — the header, 28 apart. */}
        <div className="flex flex-col items-start gap-[28px]">
          <LandingEyebrow>Events</LandingEyebrow>
          <div className="flex max-w-[867px] flex-col gap-[28px] font-display font-semibold">
            <h1
              id="events-page-title"
              className="text-6xl leading-6xl tracking-snug text-[color:var(--color-text-primary)] md:text-7xl md:leading-7xl md:tracking-tight"
            >
              Moments From IDEEZA
            </h1>
            <p className="text-2xl leading-2xl tracking-normal text-[color:var(--color-text-secondary)]">
              Moments from IDEEZA hackathons, university tours, and product launches around the world — see where our community is building.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-32 xl:gap-[120px]">
          <Featured e={first} />
          {rest.map((e) => (
            <Row key={e.slug} e={e} />
          ))}
        </div>
      </div>
    </section>
  );
}
