"use client";

// The hackathon's opening, built for the one decision a visitor makes here:
// "is this for me, and is it worth it?" — answered in the order they ask it.
//  - What do I do and what do I win: the headline says both (invent hardware,
//    win the first prize), the lead removes the fear ("no engineering
//    background needed") and names the work (3 products, votes, your university).
//  - How long: the clock, scoreboard style, counting to the next phase.
//  - Then the one primary action (Join) and the voter's way in (Vote).
// Beside it, the proof: the most-voted products themselves, playing — what
// people are actually making, not a placeholder card or a row of stat boxes.

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { HACKATHON, money, type Phase, type Row } from "@/lib/hackathons/vibe-inventing";
import { useHackathon } from "./context";
import { JoinButton, VoteLink } from "./actions";
import { Clock, ProductMedia } from "./parts";

const STATUS: Record<Phase, string> = {
  soon: "Registration opens soon",
  registration: "Registration is open",
  live: "Live now",
  judging: "Building has ended · judging",
  results: "Winners announced",
};

function clockFor(phase: Phase | null): { to: number; label: string } | null {
  const d = HACKATHON.dates;
  if (phase === "soon") return { to: d.registration, label: "Registration opens in" };
  if (phase === "registration") return { to: d.start, label: "Building starts in" };
  if (phase === null || phase === "live") return { to: d.end, label: "Building ends in" };
  if (phase === "judging") return { to: d.results, label: "Winners are announced in" };
  return null;
}

/** "Day 2 of 7" while building is on. */
function dayOf(now: number | null): string {
  if (now === null) return "";
  const total = Math.ceil((HACKATHON.dates.end - HACKATHON.dates.start) / 86_400_000);
  const day = Math.min(total, Math.floor((now - HACKATHON.dates.start) / 86_400_000) + 1);
  return ` · day ${day} of ${total}`;
}

export function HackathonHero() {
  const { now, phase, entry, board } = useHackathon();
  const c = clockFor(phase);
  // The four most-voted products, for the wall.
  const wall = board
    .filter((r) => r.p.project)
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 4);

  return (
    <section aria-labelledby="hackathon-title" className="relative isolate overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute left-[-200px] top-[-260px] -z-10 h-[820px] w-[980px] rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-violet-600)_34%,transparent),transparent)]" />

      <div className="mx-auto grid w-full max-w-[1260px] grid-cols-1 gap-20 px-8 pb-24 pt-[120px] md:pt-[152px] lg:grid-cols-[minmax(0,11fr)_minmax(0,10fr)] lg:items-center lg:gap-24 lg:pb-32 xl:px-0">
        <div className="flex flex-col items-start">
          <p className="flex items-center gap-4 text-md font-medium leading-md text-[color:var(--color-text-secondary)]">
            <span aria-hidden className={cn("size-[8px] rounded-full", phase === "live" ? "bg-[var(--color-green-400)] motion-safe:animate-pulse" : "bg-[var(--color-violet-400)]")} />
            {phase ? STATUS[phase] : " "}
            {phase === "live" ? dayOf(now) : ""}
          </p>
          <p className="mt-10 text-lg font-semibold leading-lg text-[color:var(--color-violet-300)]">{HACKATHON.name}</p>
          <h1 id="hackathon-title" className="mt-4 font-display text-6xl font-bold leading-6xl tracking-tight text-[color:var(--color-text-primary)] [text-wrap:balance] md:text-8xl md:leading-8xl">
            Invent hardware.
            <span className="block text-[color:var(--color-violet-300)]">Win {money(HACKATHON.prizes[0])}.</span>
          </h1>
          <p className="mt-10 max-w-[560px] text-xl leading-xl text-[color:var(--color-text-secondary)] [text-wrap:pretty]">
            No engineering background needed. Describe an idea in plain words and IDEEZA AI designs the concept, PCB, code and 3D. Build {HACKATHON.minProducts} products in 160 hours, collect votes and put your university on top.
          </p>

          {c ? (
            <div className="mt-16">
              <Clock to={c.to} now={now} label={c.label} />
            </div>
          ) : null}

          <div className="mt-16 flex w-full flex-col gap-6 sm:w-auto sm:flex-row sm:flex-wrap">
            <JoinButton className="w-full sm:w-auto" />
            <VoteLink className="w-full sm:w-auto" />
          </div>
          {entry.joined ? (
            <p className="mt-8 text-md leading-md text-[color:var(--color-text-primary)]">
              You&apos;re in · {entry.joined.university || "Open category"}. Build {HACKATHON.minProducts} products to qualify.
            </p>
          ) : null}
          <ul className="m-0 mt-10 flex list-none flex-wrap gap-x-8 gap-y-3 p-0 text-md leading-md text-[color:var(--color-text-secondary)]">
            {["Free to join", `${HACKATHON.minAge}+`, `Living in ${HACKATHON.where}`, "Individuals", HACKATHON.languages].map((f) => (
              <li key={f} className="flex items-center gap-3">
                <HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={2.2} aria-hidden className="text-[color:var(--color-green-400)]" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {wall.length === 4 ? <Wall rows={wall} /> : null}
      </div>
    </section>
  );
}

/**
 * The most-voted product big and playing, the next three as stills under it:
 * a curated shelf with one lead, not a grid of equal cards. The clips are
 * 16:9, so only the wide tile plays one (a narrow tile would crop the product
 * away); the stills are square product shots and fill the small tiles whole.
 */
function Wall({ rows }: { rows: Row[] }) {
  const [lead, ...rest] = rows;
  return (
    <div aria-label="Most-voted products" role="group" className="flex flex-col gap-6 lg:gap-8">
      <Tile row={lead} rank={1} big />
      <div className="grid grid-cols-3 gap-6 lg:gap-8">
        {rest.map((r, i) => (
          <Tile key={r.p.id} row={r} rank={i + 2} />
        ))}
      </div>
    </div>
  );
}

function Tile({ row, rank, big }: { row: Row; rank: number; big?: boolean }) {
  const { openProject } = useHackathon();
  const proj = row.p.project;
  if (!proj) return null;
  return (
    <button
      type="button"
      onClick={() => openProject(row)}
      aria-label={`${proj.name}, by ${row.p.name}. ${row.votes} votes. Open the project`}
      className={cn(
        "group relative block w-full overflow-hidden border border-solid border-[color:color-mix(in_srgb,var(--color-white)_10%,transparent)] p-0 text-left focus-visible:outline-none focus-visible:shadow-focus-brand",
        big ? "aspect-[16/10] rounded-3xl" : "aspect-square rounded-2xl",
      )}
    >
      {big ? (
        <ProductMedia project={proj} className="absolute inset-0 transition-transform duration-slower ease-decelerate group-hover:scale-[1.03] motion-reduce:transition-none" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={proj.image} alt="" className="absolute inset-0 h-full w-full bg-[var(--color-bg-subtle)] object-cover transition-transform duration-slower ease-decelerate group-hover:scale-[1.05] motion-reduce:transition-none" />
      )}
      <span aria-hidden className={cn("absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,color-mix(in_srgb,var(--color-black)_84%,transparent),transparent)]", big ? "h-1/2" : "h-3/4")} />
      <span className={cn("absolute flex items-center gap-2 rounded-full bg-[color:color-mix(in_srgb,var(--color-black)_64%,transparent)] font-semibold text-[color:var(--color-white)] backdrop-blur-[6px]", big ? "left-6 top-6 px-4 py-2 text-sm leading-sm" : "left-3 top-3 px-3 py-1 text-xs leading-xs")}>
        #{rank}
        {big ? ` · Most voted · ${row.votes.toLocaleString("en-US")} votes` : ""}
      </span>
      <span className={cn("absolute inset-x-0 bottom-0 flex flex-col", big ? "gap-1 p-8" : "p-4")}>
        <span className={cn("font-semibold text-[color:var(--color-white)]", big ? "text-2xl leading-2xl" : "line-clamp-2 text-sm leading-sm")}>{proj.name}</span>
        {big ? (
          <span className="truncate text-md leading-md text-[color:color-mix(in_srgb,var(--color-white)_80%,transparent)]">
            {row.p.name} · {row.p.university || "Open category"}
          </span>
        ) : (
          <span className="text-xs leading-xs tabular-nums text-[color:color-mix(in_srgb,var(--color-white)_80%,transparent)]">{row.votes.toLocaleString("en-US")} votes</span>
        )}
      </span>
    </button>
  );
}
