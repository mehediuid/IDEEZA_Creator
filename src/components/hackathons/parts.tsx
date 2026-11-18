"use client";

// Small pieces the hackathon sections share: the section frame and heading,
// a product's own media (its video, or its picture when motion is unwelcome),
// initials, and the hero brief's media addresses.

import * as React from "react";
import { cn } from "@/lib/utils";
import type { Participant } from "@/lib/hackathons/vibe-inventing";
import { useReducedMotion } from "./context";

// The briefs' media (owner, 2026-11-16) — the "Zapline" hero brief: the planet-rim
// glow video (1460 × 624, 4 s loop) and the light strip over the hero
// panel's top edge. Stored with the site (2026-11-17), not on the briefs' CDN.
export const HERO_MEDIA = {
  glow: "/hackathons/hero-glow.mp4",
  strip: "/hackathons/hero-strip.png",
  // The Prizes section's background (owner's "Vesper" brief): a white particle ribbon on black,
  // 1920 × 1080, 10 s, H.264 so every browser plays it (the brief's file was 10-bit HEVC).
  ribbon: "/hackathons/prizes-ribbon.mp4",
};

/** One section's frame: the page width, the sticky bars' scroll offset, the vertical rhythm. */
export const SECTION = "mx-auto w-full max-w-[1260px] scroll-mt-[160px] px-8 py-40 md:py-48 min-[1292px]:px-0";

/** A hairline that reads on the dark page without a box around everything. */
export const HAIRLINE = "border-[color:color-mix(in_srgb,var(--color-white)_10%,transparent)]";

/** A quiet raised surface, for the few blocks that need one (no blur, no glow). */
export const SURFACE = "border border-solid border-[color:color-mix(in_srgb,var(--color-white)_8%,transparent)] bg-[color:color-mix(in_srgb,var(--color-white)_3%,transparent)]";

/**
 * A section heading, left-aligned: the title says the point, the lead says
 * what to do with it, and `aside` holds the section's own control or figure on
 * the right (it drops under the lead on a phone).
 */
export function Heading({ id, title, lead, aside, className }: { id?: string; title: React.ReactNode; lead?: React.ReactNode; aside?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-12 md:flex-row md:items-end md:justify-between md:gap-16", className)}>
      <div className="flex max-w-[720px] flex-col gap-8 md:gap-10">
        <h2 id={id} className="font-display text-5xl font-semibold leading-5xl tracking-snug text-[color:var(--color-text-primary)] [text-wrap:balance] md:text-6xl md:leading-6xl">
          {title}
        </h2>
        {lead ? <p className="text-xl leading-xl text-[color:var(--color-text-secondary)] [text-wrap:pretty] md:text-2xl md:leading-2xl">{lead}</p> : null}
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </div>
  );
}

/**
 * A showcased product's media. The clip plays muted on a loop; its burned-in
 * caption strip (the bottom fifth of each clip) is cropped off by drawing the
 * media 125 % tall from the top inside the clipped tile. With reduced motion
 * the product's picture stands still in the same frame.
 */
export function ProductMedia({ project, className }: { project: NonNullable<Participant["project"]>; className?: string }) {
  const still = useReducedMotion();
  const media = "absolute inset-x-0 top-0 h-[125%] w-full object-cover";
  return (
    <div className={cn("overflow-hidden bg-[var(--color-bg-subtle)]", className)}>
      {still ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={project.image} alt="" className={media} />
      ) : (
        <video src={project.video} poster={project.image} autoPlay muted loop playsInline preload="metadata" aria-hidden className={media} />
      )}
    </div>
  );
}

/** Two initials in a round chip — a participant's mark where no photo exists. */
export function Initials({ name, className }: { name: string; className?: string }) {
  const s = name
    .split(" ")
    .map((x) => x[0])
    .join("")
    .slice(0, 2);
  return (
    <span aria-hidden className={cn("flex shrink-0 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--color-violet-600)_28%,transparent)] font-semibold text-[color:var(--color-violet-200)]", className)}>
      {s}
    </span>
  );
}
