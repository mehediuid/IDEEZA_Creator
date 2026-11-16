"use client";

// The hackathon's opening: where it stands (phase chip), the name and promise,
// the two facts that matter (prize pool, time left), the actions, and the
// most-voted project shown big — the prototype's placeholder card art is
// replaced by the project's own picture. Under it, the numbers, all summed
// from the standings so they can never disagree with the board.

import * as React from "react";
import { Badge } from "@/components/ideeza/badge";
import { cn } from "@/lib/utils";
import { HACKATHON, PARTICIPANTS, money, pointsOf, prizePool, type Phase } from "@/lib/hackathons/vibe-inventing";
import { countdown, useHackathon } from "./context";
import { JoinButton, SECONDARY, VoteButton, VoteLink } from "./actions";

const PHASE_CHIP: Record<Phase, string> = {
  soon: "Registration opens soon",
  registration: "Registration is open",
  live: "Build & vote · live now",
  judging: "Judging",
  results: "Winners announced",
};

function clock(phase: Phase | null): { to: number; label: string } | null {
  const d = HACKATHON.dates;
  if (phase === "soon") return { to: d.registration, label: "Registration opens in" };
  if (phase === "registration") return { to: d.start, label: "The hackathon starts in" };
  if (phase === "live") return { to: d.end, label: "The hackathon ends in" };
  if (phase === "judging") return { to: d.results, label: "Winners are announced in" };
  return null;
}

const GLASS =
  "border border-solid border-[color:color-mix(in_srgb,var(--color-white)_10%,transparent)] bg-[color:color-mix(in_srgb,var(--color-white)_4%,transparent)] backdrop-blur-md";

export function HackathonHero() {
  const { now, phase, entry, openProject } = useHackathon();
  const c = clock(phase);
  const mine = (id?: string) => (id && entry.votes.includes(id) ? 1 : 0);
  const lead = PARTICIPANTS.filter((p) => p.project).sort((a, b) => b.votes + mine(b.project?.id) - (a.votes + mine(a.project?.id)))[0];
  // The project's place on the board, counting this account's votes.
  const rankOf = (id: string) =>
    PARTICIPANTS.map((p) => ({ id: p.id, pts: pointsOf(p, mine(p.project?.id)) }))
      .sort((x, y) => y.pts - x.pts)
      .findIndex((x) => x.id === id) + 1;
  const votes = PARTICIPANTS.reduce((s, p) => s + p.votes, 0) + entry.votes.length;
  const stats = [
    { value: PARTICIPANTS.length + (entry.joined ? 1 : 0), label: "Participants" },
    { value: PARTICIPANTS.reduce((s, p) => s + p.products, 0), label: "Products built" },
    { value: votes, label: "Votes" },
    { value: HACKATHON.prizes.length, label: "Prizes to win" },
  ];

  return (
    <section aria-labelledby="hackathon-title" className="relative isolate overflow-hidden bg-[var(--color-bg-page)]">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-[-240px] -z-10 h-[760px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-violet-600)_38%,transparent),transparent)]" />

      <div className="mx-auto flex w-full max-w-[1260px] flex-col items-center px-8 pt-[136px] text-center md:pt-[168px] xl:px-0 xl:pt-[184px]">
        <Badge tone="brand" icon={phase === "live" ? <span className="size-[6px] rounded-full bg-[var(--color-green-400)] motion-safe:animate-pulse" /> : undefined}>
          {phase ? PHASE_CHIP[phase] : " "}
        </Badge>
        <h1 id="hackathon-title" className="mt-12 max-w-[920px] font-display text-6xl font-semibold leading-6xl tracking-snug text-[color:var(--color-text-primary)] md:text-7xl md:leading-7xl md:tracking-tight">
          {HACKATHON.name}
        </h1>
        <p className="mt-12 max-w-[720px] text-2xl font-regular leading-[30px] text-[color:var(--color-text-secondary)]">{HACKATHON.lead}</p>

        <dl className="mt-16 grid w-full max-w-[560px] grid-cols-2 gap-8">
          <div className={cn("flex flex-col gap-2 rounded-2xl px-8 py-8", GLASS)}>
            <dt className="order-2 text-md leading-md text-[color:var(--color-text-tertiary)]">Prize pool</dt>
            <dd className="order-1 font-display text-4xl font-semibold leading-4xl tabular-nums text-[color:var(--color-text-primary)]">{money(prizePool)}</dd>
          </div>
          <div className={cn("flex flex-col gap-2 rounded-2xl px-8 py-8", GLASS)}>
            <dt className="order-2 text-md leading-md text-[color:var(--color-text-tertiary)]">{c ? c.label : phase === "results" ? "The hackathon has ended" : " "}</dt>
            <dd className="order-1 font-display text-4xl font-semibold leading-4xl tabular-nums text-[color:var(--color-text-primary)]" aria-live="off">
              {c ? countdown(c.to, now) : phase === "results" ? "Ended" : "—"}
            </dd>
          </div>
        </dl>

        <div className="mt-16 flex flex-wrap justify-center gap-8">
          <JoinButton />
          <VoteLink />
        </div>
        {entry.joined ? (
          <p className="mt-8 text-md leading-md text-[color:var(--color-text-secondary)]">
            You&apos;re in · {entry.joined.university || "Open category"}. Build {HACKATHON.minProducts} products to qualify.
          </p>
        ) : null}
        <p className="mt-8 text-md leading-md text-[color:var(--color-text-tertiary)]">
          {HACKATHON.category} · {HACKATHON.where} · {HACKATHON.minAge}+ · Individuals · University vs university · {HACKATHON.languages}
        </p>
      </div>

      {/* The most-voted project as a featured card: what it is and who built it
          beside its picture (the prototype's placeholder art, and text floated
          over a photo, read poorly). */}
      {lead?.project ? (
        <div className="mx-auto mt-24 w-full max-w-[1260px] px-8 xl:px-0">
          <article className={cn("grid grid-cols-1 overflow-hidden rounded-[24px] md:grid-cols-[2fr_3fr]", GLASS)}>
            <div className="flex flex-col justify-center gap-8 px-8 py-12 text-left md:px-16">
              <Badge tone="brand" className="self-start">Most voted project</Badge>
              <h2 className="font-display text-5xl font-semibold leading-5xl tracking-close text-[color:var(--color-text-primary)]">{lead.project.name}</h2>
              <p className="text-lg leading-lg text-[color:var(--color-text-secondary)]">{lead.project.summary}</p>
              <p className="text-md leading-md text-[color:var(--color-text-tertiary)]">
                <b className="font-semibold text-[color:var(--color-text-primary)]">{(lead.votes + mine(lead.project.id)).toLocaleString("en-US")} votes</b> · by {lead.name}, {lead.university || "Open category"}
              </p>
              <div className="flex flex-wrap gap-3">
                {["Concept", "PCB", "Code", "3D"].map((x) => (
                  <Badge key={x} tone="neutral">{x}</Badge>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-6">
                <button type="button" onClick={() => openProject(lead, rankOf(lead.id))} className={SECONDARY("lg")}>
                  View project
                </button>
                <VoteButton projectId={lead.project.id} name={lead.project.name} />
              </div>
            </div>
            <div className="relative min-h-[280px] bg-[var(--color-bg-subtle)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={lead.project.image} alt={lead.project.name} className="absolute inset-0 h-full w-full object-cover" />
            </div>
          </article>
        </div>
      ) : null}

      <div className="mx-auto mt-24 w-full max-w-[1260px] px-8 pb-24 xl:px-0">
        <dl className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className={cn("flex flex-col items-center gap-2 rounded-2xl px-8 py-10", GLASS)}>
              <dt className="order-2 text-md leading-md text-[color:var(--color-text-tertiary)]">{s.label}</dt>
              <dd className="order-1 font-display text-5xl font-semibold leading-5xl tabular-nums text-[color:var(--color-text-primary)]">{s.value.toLocaleString("en-US")}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-center text-sm leading-sm text-[color:var(--color-text-tertiary)]">Standings and numbers on this page are sample data.</p>
      </div>
    </section>
  );
}
