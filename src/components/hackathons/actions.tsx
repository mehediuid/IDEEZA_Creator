"use client";

// The page's two actions, drawn the same everywhere they appear: Join (the one
// primary on the page) and Vote. Join follows the account: signed out it is the
// way in (Sign up, or Sign in once this browser has an account) and comes back
// to join; signed in it opens the join step; joined it reads "Start building"
// and goes to Home. Vote is open only while the hackathon is live. On the
// closing brand panel Join wears the DS inverse fill (violet on violet would vanish).

import * as React from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { buttonVariants } from "@/components/ideeza/button";
import { LANDING_SECONDARY } from "@/components/landing/buttons";
import { cn } from "@/lib/utils";
import { HACKATHON } from "@/lib/hackathons/vibe-inventing";
import { canJoin, canVote, useHackathon } from "./context";

type Size = "md" | "lg" | "xl" | "2xl";

// Join and Vote are often anchors, and reset.css gives every a:hover the link
// colour, which outranks a button's text class — so each look pins its own
// text colour on hover (a light-blue word on the white button was unreadable).
export const PRIMARY = (size: Size = "2xl") => cn(buttonVariants({ hierarchy: "primary", size }), "rounded-full hover:text-[color:var(--color-button-primary-text)]");
export const SECONDARY = (size: Size = "2xl") => cn(buttonVariants({ hierarchy: "secondary", size }), LANDING_SECONDARY, "hover:text-[color:var(--color-text-primary)]");
const INVERSE = (size: Size) => cn(buttonVariants({ hierarchy: "inverse", size }), "rounded-full hover:text-[color:var(--color-button-inverse-text)]");

// The prototype's call for this format: a team registers, a person joins.
const JOIN = HACKATHON.unit === "team" ? "Register your team" : "Join the hackathon";

export function JoinButton({ size = "2xl", tone = "default", arrow, className }: { size?: Size; tone?: "default" | "inverse"; arrow?: boolean; className?: string }) {
  const { phase, entry, joinHref, openJoin } = useHackathon();
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
  if (phase !== null && !canJoin(phase)) {
    return (
      <span aria-disabled="true" className={cn(look, "pointer-events-none opacity-50", className)}>
        {phase === "soon" ? "Registration opens soon" : "Joining has closed"}
      </span>
    );
  }
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

/** Goes to the shelf of products, where the votes are cast. */
export function VoteLink({ size = "2xl", className }: { size?: Size; className?: string }) {
  return (
    <a href="#vote" className={cn(SECONDARY(size), className)}>
      Vote for projects
    </a>
  );
}

export function VoteButton({ projectId, name, className }: { projectId: string; name: string; className?: string }) {
  const { phase, entry, voteHref } = useHackathon();
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
          setNote(ok ? "" : `You have used all ${HACKATHON.votesPerPerson} votes. Take one back to vote again.`);
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
