"use client";

// The page's two actions, drawn the same everywhere they appear: Join (the one
// primary on the page) and Vote. Join follows the account: signed out it is the
// way in (Sign up, or Sign in once this browser has an account) and comes back
// to join; signed in it opens the join step; joined it reads "Start building"
// and goes to Home. Once joining has closed it is not shown (the prototype's
// landing page), and the other action — See the projects / See the winners —
// takes the primary look. Vote is open only while the hackathon is live. On
// the closing brand panel Join wears the DS inverse fill (violet on violet would vanish).

import * as React from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { buttonVariants } from "@/components/ideeza/button";
import { LANDING_SECONDARY } from "@/components/landing/buttons";
import { cn } from "@/lib/utils";
import { canJoin, canVote, useHackathon } from "./context";

type Size = "md" | "lg" | "xl" | "2xl";

// Join and Vote are often anchors, and reset.css gives every a:hover the link
// colour, which outranks a button's text class — so each look pins its own
// text colour on hover (a light-blue word on the white button was unreadable).
export const PRIMARY = (size: Size = "2xl") => cn(buttonVariants({ hierarchy: "primary", size }), "rounded-full hover:text-[color:var(--color-button-primary-text)]");
export const SECONDARY = (size: Size = "2xl") => cn(buttonVariants({ hierarchy: "secondary", size }), LANDING_SECONDARY, "hover:text-[color:var(--color-text-primary)]");
export const INVERSE = (size: Size = "2xl") => cn(buttonVariants({ hierarchy: "inverse", size }), "rounded-full hover:text-[color:var(--color-button-inverse-text)]");

export function JoinButton({ size = "2xl", tone = "default", arrow, className }: { size?: Size; tone?: "default" | "inverse"; arrow?: boolean; className?: string }) {
  const { phase, entry, joinHref, openJoin, unit } = useHackathon();
  // The prototype's call for this style: a team registers, a person joins.
  const JOIN = unit === "team" ? "Register your team" : "Join the hackathon";
  const look = cn(tone === "inverse" ? INVERSE(size) : PRIMARY(size), arrow && "group gap-4");
  // The arrow steps forward on hover (the closing panel's call).
  const tail = arrow ? <HugeiconsIcon icon={ArrowRight01Icon} size={20} strokeWidth={2} aria-hidden className="transition-transform duration-fast ease-decelerate group-hover:translate-x-2 motion-reduce:transition-none" /> : null;
  if (entry.joined) {
    return (
      <Link href="/" className={cn(look, className)}>
        Start building
        {tail}
      </Link>
    );
  }
  if (phase === "soon") {
    return (
      <span aria-disabled="true" className={cn(look, "pointer-events-none opacity-50", className)}>
        Registration opens soon
      </span>
    );
  }
  if (phase !== null && !canJoin(phase)) return null;
  if (!entry.signedIn) {
    return (
      <Link href={joinHref} className={cn(look, className)}>
        {JOIN}
        {tail}
      </Link>
    );
  }
  return (
    <button type="button" onClick={openJoin} className={cn(look, className)}>
      {JOIN}
      {tail}
    </button>
  );
}

/** Goes to the standings, where the votes are cast (the matches in 1 vs 1). */
export function VoteLink({ size = "2xl", tone, className }: { size?: Size; tone?: "inverse"; className?: string }) {
  const { phase } = useHackathon();
  // The prototype's second call: vote while it is live, the winners once they are out, else the projects.
  const label = phase === "results" ? "See the winners" : phase === "live" || phase === null ? "Vote for projects" : "See the projects";
  // When Join is not shown (joining has closed) this is the page's one call.
  const look = phase !== null && phase !== "soon" && !canJoin(phase) ? (tone === "inverse" ? INVERSE(size) : PRIMARY(size)) : SECONDARY(size);
  return (
    <a href="#leaderboard" className={cn(look, className)}>
      {label}
    </a>
  );
}

export function VoteButton({ projectId, name, className }: { projectId: string; name: string; className?: string }) {
  const { c, phase, entry, voteHref } = useHackathon();
  const [note, setNote] = React.useState("");
  const voted = entry.votes.includes(projectId);
  const base = cn(
    buttonVariants({ hierarchy: voted ? "secondary" : "primary", size: "md" }),
    "rounded-full",
    voted ? cn(LANDING_SECONDARY, "hover:text-[color:var(--color-text-primary)]") : "hover:text-[color:var(--color-button-primary-text)]",
    className,
  );
  if (!canVote(phase)) {
    return (
      <span aria-disabled="true" title="Voting is open while the hackathon is live" className={cn(base, "pointer-events-none opacity-50")}>
        Vote
      </span>
    );
  }
  if (!entry.signedIn) {
    return (
      <Link href={voteHref} className={base} aria-label={`Vote for ${name}`}>
        Vote
      </Link>
    );
  }
  return (
    <span className="inline-flex flex-col items-start gap-2">
      <button
        type="button"
        aria-pressed={voted}
        aria-label={voted ? `Take back your vote for ${name}` : `Vote for ${name}`}
        onClick={() => {
          const ok = entry.toggleVote(projectId);
          setNote(ok ? "" : `You have used all ${c.HACKATHON.votesPerPerson} votes. Take one back to vote again.`);
        }}
        className={base}
      >
        {voted ? "Voted" : "Vote"}
      </button>
      {note ? (
        <span role="status" className="text-md leading-md text-[color:var(--color-text-warning)]">
          {note}
        </span>
      ) : null}
    </span>
  );
}
