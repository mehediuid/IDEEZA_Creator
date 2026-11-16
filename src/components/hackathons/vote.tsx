"use client";

// Vote: the voter's whole job on one shelf — every published product with its
// picture, what it does, who made it, its votes and the Vote button. Before,
// voting hid inside the podium cards and a dialog; a friend arriving from a
// shared link had to hunt for it. The votes left are counted in the heading.

import * as React from "react";
import { cn } from "@/lib/utils";
import { HACKATHON } from "@/lib/hackathons/vibe-inventing";
import { useHackathon } from "./context";
import { VoteButton } from "./actions";
import { Heading, SECTION, SURFACE } from "./parts";

export function VoteShelf() {
  const { board, entry, openProject } = useHackathon();
  const items = board.filter((r) => r.p.project).sort((a, b) => b.votes - a.votes);
  const used = HACKATHON.votesPerPerson - entry.votesLeft;

  return (
    <section id="vote" aria-labelledby="vote-title" className={SECTION}>
      <Heading
        id="vote-title"
        title="Vote for the products you'd use"
        lead="Every vote is a point for the builder and their university. Signed-in accounts vote, and you can take a vote back while voting is open."
        aside={
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
        }
      />

      <ul className="m-0 mt-20 grid list-none grid-cols-1 gap-8 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((r) => {
          const proj = r.p.project;
          if (!proj) return null;
          const mine = entry.votes.includes(proj.id);
          return (
            <li key={proj.id} className={cn("flex flex-col overflow-hidden rounded-3xl", SURFACE, mine && "border-[color:color-mix(in_srgb,var(--color-violet-400)_60%,transparent)]")}>
              <button type="button" onClick={() => openProject(r)} aria-label={`Open ${proj.name}`} className="group relative block aspect-[4/3] overflow-hidden border-0 bg-[var(--color-bg-subtle)] p-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={proj.image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-slower ease-decelerate group-hover:scale-[1.04] motion-reduce:transition-none" />
                <span className="absolute left-4 top-4 rounded-full bg-[color:color-mix(in_srgb,var(--color-black)_64%,transparent)] px-4 py-2 text-md font-semibold leading-md text-[color:var(--color-white)] backdrop-blur-[6px]">#{r.rank} on the board</span>
              </button>
              <div className="flex flex-1 flex-col gap-4 px-8 pb-8 pt-6">
                <div className="flex flex-col gap-1">
                  <h3 className="text-2xl font-semibold leading-2xl text-[color:var(--color-text-primary)]">{proj.name}</h3>
                  <p className="truncate text-md leading-md text-[color:var(--color-text-tertiary)]">
                    {r.p.name} · {r.p.university || "Open category"}
                  </p>
                </div>
                <p className="text-lg leading-lg text-[color:var(--color-text-secondary)]">{proj.summary}</p>
                <div className="mt-auto flex items-center justify-between gap-6 pt-4">
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
