"use client";

// "Events — Moments From IDEEZA": a short take on the website's Events page
// for the landing page (owner 2026-11-05), placed above Mobile App (owner). Source: Figma IDEEZA Website V-2,
// page "Join Waitlist", frame 18542:22943 "Event for Join Waitlist" — its
// header (18542:23873) and its three events (18542:23882, 18542:23895,
// 18542:23908), each shown here as the page's own event card at a third of
// the width: a 20-radius frame with a lilac ring (raw in Figma), the photo
// inside it at radius 14 with a color/border/strong ring, darkened to the page
// colour from the middle down, the title and its line on top.
//
// Below lg the cards sit in one row that swipes sideways (the next card peeks
// in), so the section stays short on a phone; from lg they are three columns.
// The cards are one still picture (no card is a link — as the Creator Feed);
// one Explore Events button under them opens the Events page (/events).
//
// The photos are the real events' (Figma's image fills, cropped square);
// titles, lines and photos come from ./data, shared with /events.
//
// A client module only because buttonVariants lives in the client-only
// button.tsx and cannot be called from a server component.

import Link from "next/link";
import { LandingSectionHeader } from "@/components/landing/section-header";
import { LANDING_SECONDARY } from "@/components/landing/buttons";
import { buttonVariants } from "@/components/ideeza/button";
import { cn } from "@/lib/utils";
import { EVENTS } from "./data";

export function Events() {
  return (
    <section aria-labelledby="events-title" className="relative bg-[var(--color-bg-page)]">
      <div className="relative mx-auto flex w-full max-w-[1260px] flex-col gap-24 px-8 py-40 xl:gap-[92px] xl:px-0 xl:py-[150px]">
        {/* Figma 18542:23874 — the eyebrow, Display/MD title and lead (centred, as every landing section). */}
        <LandingSectionHeader
          id="events-title"
          eyebrow="Events"
          title="Moments From IDEEZA"
          lead="Moments from IDEEZA hackathons, university tours, and product launches around the world — see where our community is building."
        />

        <div className="flex w-full flex-col items-center gap-24">
          <ul className="m-0 -mx-8 flex w-[calc(100%+var(--spacing-16))] snap-x snap-mandatory scroll-px-8 list-none gap-12 overflow-x-auto px-8 pb-4 lg:mx-0 lg:grid lg:w-full lg:grid-cols-3 lg:overflow-visible lg:px-0 lg:pb-0 xl:gap-[24px]">
            {EVENTS.map((e) => (
              <li key={e.slug} className="w-[85%] max-w-[404px] shrink-0 snap-start rounded-[20px] border-solid border border-[rgba(210,197,252,0.2)] p-[12px] lg:w-auto lg:max-w-none">
                {/* Figma 18542:23883 / 23901 / 23922 — the photo, its ring and the fade to the page colour. */}
                <div className="relative flex h-[320px] flex-col justify-end overflow-hidden rounded-[14px] border-solid border border-[var(--color-border-strong)] p-12 lg:h-[440px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={e.square}
                    alt={e.coverAlt}
                    width={900}
                    height={900}
                    loading="lazy"
                    className="absolute inset-0 block size-full object-cover"
                  />
                  <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,transparent_44.568%,var(--color-bg-page)_107.21%)]" />
                  <div className="relative flex flex-col gap-2 font-display">
                    <h3 className="text-4xl font-semibold leading-4xl tracking-close text-[color:var(--color-text-primary)]">{e.title}</h3>
                    <p className="text-xl font-medium leading-2xl tracking-normal text-[color:var(--color-text-secondary)]">{e.line}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <Link href="/events" className={cn(buttonVariants({ hierarchy: "secondary", size: "2xl" }), LANDING_SECONDARY)}>
            Explore Events
          </Link>
        </div>
      </div>
    </section>
  );
}
