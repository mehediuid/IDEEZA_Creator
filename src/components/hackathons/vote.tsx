"use client";

// Vote: the voter's whole job on one shelf — every published product with its
// picture, what it does, who made it, its votes and the Vote button. Before,
// voting hid inside the podium cards and a dialog; a friend arriving from a
// shared link had to hunt for it. The votes left are counted in the heading.
// In 1 vs 1 the votes are cast in the matches, so this shelf is not shown
// (owner 2026-11-17: two places to vote for the same products made no sense);
// the matches carry the votes-left count instead.

import * as React from "react";
import { cn } from "@/lib/utils";
import { GROUP, HACKATHON, entrantOf, groupOf } from "@/lib/hackathons/vibe-inventing";
import { useHackathon } from "./context";
import { VoteButton } from "./actions";
import { Heading, SECTION, SURFACE } from "./parts";

/** "n of 10 votes left" over ten pips — the voter's count, beside the place they vote. */
export function VotesLeft() {
  const { entry } = useHackathon();
  const used = HACKATHON.votesPerPerson - entry.votesLeft;
  return (
    <div className="flex flex-col gap-3 md:items-end">
      <span className="text-lg font-medium leading-lg text-[color:var(--color-text-secondary)]">
        {entry.signedIn ? `${entry.votesLeft} of ${HACKATHON.votesPerPerson} votes left` : `${HACKATHON.votesPerPerson} votes per account`}
      </span>
      <span aria-hidden className="flex gap-2">
        {Array.from({ length: HACKATHON.votesPerPerson }, (_, i) => (
          <span key={i} className={cn("h-[8px] w-[20px] rounded-full", entry.signedIn && i < used ? "bg-[var(--color-violet-400)]" : "bg-[color:color-mix(in_srgb,var(--color-white)_14%,transparent)]")} />
        ))}
      </span>
    </div>
  );
}

export function VoteShelf() {
  const { board, entry, openProject, unit } = useHackathon();
  const items = board.filter((r) => r.p.project).sort((a, b) => b.votes - a.votes);
  if (unit === "duel") return null;

  return (
    <section id="vote" aria-labelledby="vote-title" className={SECTION}>
      <Heading
        id="vote-title"
        title="Vote for the products you'd use"
        lead={`Every vote is a point for the ${entrantOf(unit).one}${GROUP ? ` and their ${GROUP.one}` : ""}. Signed-in accounts vote, and you can take a vote back while voting is open.`}
        aside={<VotesLeft />}
      />

      <ul className="m-0 mt-24 grid list-none grid-cols-1 gap-10 p-0 sm:grid-cols-2 md:mt-32 lg:grid-cols-3 lg:gap-12">
        {items.map((r) => {
          const proj = r.p.project;
          if (!proj) return null;
          const mine = entry.votes.includes(proj.id);
          return (
            <li key={proj.id} className={cn("flex flex-col overflow-hidden rounded-3xl", SURFACE, mine && "border-[color:color-mix(in_srgb,var(--color-violet-400)_60%,transparent)]")}>
              <button type="button" onClick={() => openProject(r)} aria-label={`Open ${proj.name}`} className="group relative block aspect-[4/3] overflow-hidden border-0 bg-[var(--color-bg-subtle)] p-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={proj.image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-slower ease-decelerate group-hover:scale-[1.04] motion-reduce:transition-none" />
              </button>
              <div className="flex flex-1 flex-col gap-5 px-10 pb-10 pt-8">
                <div className="flex flex-col gap-2">
                  <h3 className="text-2xl font-semibold leading-2xl text-[color:var(--color-text-primary)]">{proj.name}</h3>
                  <p className="truncate text-md leading-md text-[color:var(--color-text-tertiary)]">
                    {[r.p.name, groupOf(r.p)].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <p className="text-lg leading-lg text-[color:var(--color-text-secondary)]">{proj.summary}</p>
                <div className="mt-auto flex items-center justify-between gap-6 pt-6">
                  <span className="flex items-baseline gap-2">
                    <span className="font-display text-3xl font-semibold leading-3xl tabular-nums text-[color:var(--color-text-primary)]">{r.votes.toLocaleString("en-US")}</span>
                    <span className="text-lg leading-lg text-[color:var(--color-text-tertiary)]">votes</span>
                  </span>
                  <VoteButton projectId={proj.id} name={proj.name} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
