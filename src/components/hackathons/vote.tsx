"use client";

// The voter's count, beside the place they vote (the leaderboard's list, or
// the matches in 1 vs 1): "n of 10 votes left" over ten pips, as the
// prototype's landing page shows it. Since 2026-11-17 (owner: the prototype
// landing page's content is final) there is no separate Vote shelf: the votes
// are cast on the leaderboard.

import * as React from "react";
import { cn } from "@/lib/utils";
import { useHackathon } from "./context";

export function VotesLeft() {
  const { c, entry } = useHackathon();
  const { HACKATHON } = c;
  // Signed out nothing is used yet: all of them are left.
  const left = entry.signedIn ? entry.votesLeft : HACKATHON.votesPerPerson;
  const used = HACKATHON.votesPerPerson - left;
  return (
    <div className="flex flex-col gap-3 md:items-end">
      <span className="text-lg font-medium leading-lg tabular-nums text-[color:var(--color-text-secondary)]">
        {left} of {HACKATHON.votesPerPerson} votes left
      </span>
      {HACKATHON.votesPerPerson <= 20 ? (
        <span aria-hidden className="flex gap-2">
          {Array.from({ length: HACKATHON.votesPerPerson }, (_, i) => (
            <span key={i} className={cn("h-[8px] w-[20px] rounded-full", i < used ? "bg-[var(--color-violet-400)]" : "bg-[color:color-mix(in_srgb,var(--color-white)_14%,transparent)]")} />
          ))}
        </span>
      ) : null}
    </div>
  );
}
