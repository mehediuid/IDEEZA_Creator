"use client";

// What rises under the hero: the brief's violet-edged panel with a light line
// along its top, holding pictures, not an app (owner 2026-11-16: "no
// dashboard or web application here — show the image that is needed"). The
// picture a visitor needs is what they would make: the most-voted products of
// this hackathon, set as a stage — #1 in the middle, playing its own clip,
// the next four as stills stepping down to either side. Each opens its
// project. Real product pictures only; no invented people.

import * as React from "react";
import { cn } from "@/lib/utils";
import type { Row } from "@/lib/hackathons/vibe-inventing";
import { useHackathon } from "./context";
import { HERO_MEDIA, ProductMedia } from "./parts";

// Desktop stage: the tiles' order left to right is #4 · #2 · #1 · #3 · #5;
// the further from the middle, the lower the tile sits (a gentle arc).
const STAGE = [3, 1, 0, 2, 4];
const DROP = ["lg:mt-16", "lg:mt-6", "", "lg:mt-6", "lg:mt-16"];

export function HeroShowcase() {
  const { board } = useHackathon();
  const top = board
    .filter((r) => r.p.project)
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 5);
  if (top.length < 5) return null;

  return (
    <div className="ix-hk-rise relative" style={{ animationDelay: "720ms" }}>
      {/* The light along the top edge: the brief's glow strip, screen-blended, over a thin violet line. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={HERO_MEDIA.strip} alt="" aria-hidden className="pointer-events-none absolute left-1/2 top-[-30px] z-[1] h-[60px] w-[78%] -translate-x-1/2 mix-blend-screen" />
      <div aria-hidden className="absolute inset-x-[10%] top-0 z-[1] h-px bg-[linear-gradient(90deg,transparent,var(--color-violet-300),transparent)] shadow-[0_0_16px_2px_color-mix(in_srgb,var(--color-violet-500)_70%,transparent)]" />

      <div
        role="group"
        aria-label="Most-voted products so far"
        className="overflow-hidden rounded-2xl border border-solid border-[color:color-mix(in_srgb,var(--color-violet-400)_32%,transparent)] bg-[color:color-mix(in_srgb,var(--color-bg-page)_80%,transparent)] p-3 shadow-[0_-30px_100px_-30px_color-mix(in_srgb,var(--color-violet-600)_55%,transparent)] backdrop-blur-[12px] md:p-4"
      >
        {/* Phone and tablet: #1 wide on top, the next four in a 2 × 2 (4 across from md). */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4 lg:hidden">
          <Tile row={top[0]} rank={1} lead className="col-span-2 md:col-span-4" />
          {top.slice(1).map((r, i) => (
            <Tile key={r.p.id} row={r} rank={i + 2} />
          ))}
        </div>
        {/* Desktop: the stage. */}
        <div className="hidden grid-cols-[1fr_1fr_1.7fr_1fr_1fr] items-start gap-4 lg:grid">
          {STAGE.map((k, i) => {
            const r = top[k];
            return r ? <Tile key={r.p.id} row={r} rank={k + 1} lead={k === 0} className={cn("ix-hk-rise", DROP.at(i))} delay={900 + Math.abs(i - 2) * 120} /> : null;
          })}
        </div>
      </div>
      <p className="mt-4 text-center text-sm leading-sm text-[color:var(--color-text-tertiary)]">Most-voted products so far, all built with IDEEZA AI · sample standings</p>
    </div>
  );
}

function Tile({ row, rank, lead, className, delay }: { row: Row; rank: number; lead?: boolean; className?: string; delay?: number }) {
  const { openProject } = useHackathon();
  const proj = row.p.project;
  if (!proj) return null;
  return (
    <button
      type="button"
      onClick={() => openProject(row)}
      aria-label={`${proj.name}, by ${row.p.name}. ${row.votes} votes. Open the project`}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
      className={cn(
        "group relative block w-full overflow-hidden rounded-xl border border-solid border-[color:color-mix(in_srgb,var(--color-white)_10%,transparent)] p-0 text-left focus-visible:outline-none focus-visible:shadow-focus-brand",
        lead ? "aspect-[16/10] lg:aspect-[4/5]" : "aspect-square lg:aspect-[3/4]",
        className,
      )}
    >
      {lead ? (
        <ProductMedia project={proj} className="absolute inset-0 transition-transform duration-slower ease-decelerate group-hover:scale-[1.03] motion-reduce:transition-none" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={proj.image} alt="" className="absolute inset-0 h-full w-full bg-[var(--color-bg-subtle)] object-cover transition-transform duration-slower ease-decelerate group-hover:scale-[1.05] motion-reduce:transition-none" />
      )}
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-3/5 bg-[linear-gradient(to_top,color-mix(in_srgb,var(--color-black)_84%,transparent),transparent)]" />
      <span className={cn("absolute left-3 top-3 rounded-full bg-[color:color-mix(in_srgb,var(--color-black)_64%,transparent)] font-semibold text-[color:var(--color-white)] backdrop-blur-[6px]", lead ? "px-4 py-2 text-sm leading-sm" : "px-3 py-1 text-xs leading-xs")}>
        #{rank}
        {lead ? ` · Most voted · ${row.votes.toLocaleString("en-US")} votes` : ""}
      </span>
      <span className={cn("absolute inset-x-0 bottom-0 flex flex-col", lead ? "gap-1 p-6" : "gap-1 p-4")}>
        <span className={cn("font-semibold text-[color:var(--color-white)]", lead ? "text-2xl leading-2xl" : "line-clamp-2 text-sm leading-sm")}>{proj.name}</span>
        <span className={cn("truncate text-[color:color-mix(in_srgb,var(--color-white)_80%,transparent)]", lead ? "text-md leading-md" : "text-xs leading-xs")}>
          {lead ? `${row.p.name} · ${row.p.university || "Open category"}` : `${row.votes.toLocaleString("en-US")} votes`}
        </span>
      </span>
    </button>
  );
}
