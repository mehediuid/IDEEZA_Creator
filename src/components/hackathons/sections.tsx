"use client";

// The hackathon page's sections after the standings. Fixes over the prototype:
//  - one site top bar (the page no longer draws its own logo bar); a sticky
//    section bar under it carries the page's own anchors and Join;
//  - How it works: seven steps fill a 4-column grid with the Join card as the
//    eighth tile, instead of a row with a hole;
//  - judging criteria as one weighted bar, not three loose chips;
//  - the timeline is ONE stepper (dates on their phase, the current phase lit),
//    not date cards plus a second row of phase pills;
//  - the closing call asks for this page's actions (Join · Vote), not the
//    landing page's.

import * as React from "react";
import { LandingEyebrow, LandingSectionHeader } from "@/components/landing/section-header";
import { cn } from "@/lib/utils";
import { HACKATHON, money, prizePool, type Phase } from "@/lib/hackathons/vibe-inventing";
import { eat, useHackathon } from "./context";
import { JoinButton, VoteLink } from "./actions";

export const GLASS =
  "border border-solid border-[color:color-mix(in_srgb,var(--color-white)_10%,transparent)] bg-[color:color-mix(in_srgb,var(--color-white)_4%,transparent)]";
export const SECTION = "mx-auto w-full max-w-[1260px] scroll-mt-[152px] px-8 py-32 md:py-40 xl:px-0";

const ANCHORS = [
  ["prizes", "Prizes"],
  ["leaderboard", "Leaderboard"],
  ["how", "How it works"],
  ["dates", "Dates"],
  ["faq", "FAQ"],
] as const;

/** The page's own bar, under the site's: its sections and Join. */
export function SectionNav() {
  const [active, setActive] = React.useState<string>("");
  React.useEffect(() => {
    const els = ANCHORS.map(([id]) => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver(
      (es) => {
        const seen = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (seen) setActive(seen.target.id);
      },
      { rootMargin: "-160px 0px -55% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
  return (
    <div className="sticky top-[80px] z-[5] border-0 border-y border-solid border-[color:color-mix(in_srgb,var(--color-white)_8%,transparent)] bg-[color:color-mix(in_srgb,var(--color-bg-page)_80%,transparent)] backdrop-blur-[24px]">
      <nav aria-label="On this page" className="mx-auto flex h-[60px] w-full max-w-[1260px] items-center justify-between gap-8 px-8 xl:px-0">
        <ul className="m-0 flex min-w-0 list-none gap-2 overflow-x-auto p-0 [scrollbar-width:none]">
          {ANCHORS.map(([id, label]) => (
            <li key={id}>
              <a
                href={`#${id}`}
                aria-current={active === id ? "true" : undefined}
                className={cn(
                  "flex h-[36px] items-center whitespace-nowrap rounded-full px-6 text-md font-medium leading-md text-[color:var(--color-text-secondary)] transition-colors duration-fast hover:text-[color:var(--color-text-primary)]",
                  active === id && "bg-[color:color-mix(in_srgb,var(--color-white)_8%,transparent)] text-[color:var(--color-text-primary)]",
                )}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
        <JoinButton size="md" className="hidden shrink-0 md:inline-flex" />
      </nav>
    </div>
  );
}

export function Prizes() {
  const place = ["1st place", "2nd place", "3rd place"];
  return (
    <section id="prizes" aria-labelledby="prizes-title" className={SECTION}>
      <LandingSectionHeader id="prizes-title" eyebrow="Prizes" title={`${money(prizePool)} in prizes`} lead={`Plus: ${HACKATHON.extras}`} />
      <ol className="m-0 mt-16 grid list-none grid-cols-1 gap-8 p-0 md:grid-cols-3">
        {HACKATHON.prizes.map((a, i) => (
          <li
            key={i}
            className={cn(
              "flex flex-col items-center gap-4 rounded-2xl px-8 py-16 text-center",
              GLASS,
              i === 0 && "border-[color:color-mix(in_srgb,var(--color-violet-400)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--color-violet-600)_14%,transparent)] shadow-[0_0_56px_color-mix(in_srgb,var(--color-violet-600)_30%,transparent)]",
            )}
          >
            <span className="text-md font-medium leading-md text-[color:var(--color-text-secondary)]">{place.at(i)}</span>
            <span className={cn("font-display font-semibold tabular-nums text-[color:var(--color-text-primary)]", i === 0 ? "text-6xl leading-6xl" : "text-5xl leading-5xl")}>{money(a)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

const STEPS: [string, string][] = [
  ["Sign up or log in", "Create your IDEEZA account and verify your email."],
  ["Join the hackathon", "Join from this page and pick your university. You get a personal link to share."],
  ["Build", `Build ${HACKATHON.minProducts} or more products with IDEEZA AI on Low quality. A product counts when every design stage is done.`],
  ["Publish", "Publish each product to the NFT marketplace under Give to Community and to the social feed. No wallet or KYC is needed."],
  ["Share and collect votes", "Share your personal link anywhere. Votes on the IDEEZA social feed count."],
  ["Earn points", "Builds, posts, votes, referrals and build streaks all add to one score on the leaderboard."],
  ["Climb and win", `When the hackathon ends the leaderboard freezes. The top ${HACKATHON.shortlist} are shortlisted and the judges pick the winners.`],
];

export function HowItWorks() {
  return (
    <section id="how" aria-labelledby="how-title" className={SECTION}>
      <LandingSectionHeader id="how-title" eyebrow="How to take part" title={`From idea to the competition in ${STEPS.length} steps`} lead="No engineering background needed. Describe your idea in plain language and IDEEZA AI generates the full hardware design." />
      <ol className="m-0 mt-16 grid list-none grid-cols-1 gap-8 p-0 sm:grid-cols-2 xl:grid-cols-4">
        {STEPS.map(([t, d], i) => (
          <li key={t} className={cn("flex flex-col gap-4 rounded-2xl px-8 py-10", GLASS)}>
            <span className="bg-[linear-gradient(90deg,var(--color-violet-300),var(--color-blue-300))] bg-clip-text font-display text-5xl font-semibold leading-5xl text-transparent tabular-nums">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="text-2xl font-semibold leading-2xl text-[color:var(--color-text-primary)]">{t}</span>
            <span className="text-md leading-md text-[color:var(--color-text-secondary)]">{d}</span>
          </li>
        ))}
        {/* The eighth tile: the step to take now. */}
        <li className="flex flex-col justify-between gap-8 rounded-2xl border border-solid border-[color:color-mix(in_srgb,var(--color-violet-400)_50%,transparent)] bg-[color:color-mix(in_srgb,var(--color-violet-600)_16%,transparent)] px-8 py-10">
          <span className="text-2xl font-semibold leading-2xl text-[color:var(--color-text-primary)]">Ready? Start with step one.</span>
          <JoinButton size="lg" className="self-start" />
        </li>
      </ol>
    </section>
  );
}

export function WhoAndJudging() {
  const who = [
    HACKATHON.who,
    `Open to participants in ${HACKATHON.where}`,
    `You must be ${HACKATHON.minAge} or older`,
    "You compete as an individual",
    "You pick your university when you join. Not part of one? Join the open category",
    "You need an IDEEZA account with a verified email",
    "Judges cannot take part or vote",
  ];
  return (
    <section aria-label="Who can participate and how the winner is decided" className={SECTION}>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className={cn("flex flex-col gap-8 rounded-2xl px-8 py-12 md:px-12", GLASS)}>
          <LandingEyebrow className="self-start">For everyone</LandingEyebrow>
          <h2 className="font-display text-5xl font-semibold leading-5xl tracking-close text-[color:var(--color-text-primary)]">Who can participate</h2>
          <ul className="m-0 flex list-none flex-col gap-6 p-0">
            {who.map((w) => (
              <li key={w} className="flex items-start gap-4 text-lg leading-lg text-[color:var(--color-text-secondary)]">
                <span aria-hidden className="mt-[3px] flex size-[18px] shrink-0 items-center justify-center rounded-full bg-[var(--color-button-primary-bg)] text-[10px] text-[color:var(--color-white)]">✓</span>
                {w}
              </li>
            ))}
          </ul>
        </div>
        <div className={cn("flex flex-col gap-8 rounded-2xl px-8 py-12 md:px-12", GLASS)}>
          <LandingEyebrow className="self-start">Judging</LandingEyebrow>
          <h2 className="font-display text-5xl font-semibold leading-5xl tracking-close text-[color:var(--color-text-primary)]">How the winner is decided</h2>
          <p className="text-lg leading-lg text-[color:var(--color-text-secondary)]">
            When the hackathon ends the standings freeze and the <b className="font-semibold text-[color:var(--color-text-primary)]">top {HACKATHON.shortlist}</b> are shortlisted. The judges score them and confirm the winners.
          </p>
          <div>
            <div className="flex h-[40px] w-full overflow-hidden rounded-xl" role="img" aria-label={HACKATHON.criteria.map((c) => `${c.name} ${c.weight}%`).join(", ")}>
              {HACKATHON.criteria.map((c, i) => (
                <div
                  key={c.name}
                  style={{ flexGrow: c.weight }}
                  className={cn(
                    "flex basis-0 items-center justify-center text-sm font-semibold leading-sm text-[color:var(--color-white)]",
                    ["bg-[var(--color-violet-600)]", "bg-[var(--color-violet-500)]", "bg-[var(--color-blue-500)]"].at(i),
                  )}
                >
                  {c.weight}%
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-md leading-md text-[color:var(--color-text-secondary)]">
              {HACKATHON.criteria.map((c, i) => (
                <span key={c.name} className="inline-flex items-center gap-3">
                  <span aria-hidden className={cn("size-[10px] rounded-full", ["bg-[var(--color-violet-600)]", "bg-[var(--color-violet-500)]", "bg-[var(--color-blue-500)]"].at(i))} />
                  {c.name}
                </span>
              ))}
            </div>
          </div>
          <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2">
            {HACKATHON.judges.map((j) => (
              <li key={j.name} className={cn("flex items-center gap-6 rounded-xl px-6 py-5", GLASS)}>
                <span className="flex size-[40px] shrink-0 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--color-violet-600)_30%,transparent)] text-md font-semibold text-[color:var(--color-text-primary)]">
                  {j.name
                    .split(" ")
                    .map((x) => x[0])
                    .join("")
                    .slice(0, 2)}
                </span>
                <span className="flex flex-col">
                  <span className="text-md font-semibold leading-md text-[color:var(--color-text-primary)]">{j.name}</span>
                  <span className="text-sm leading-sm text-[color:var(--color-text-tertiary)]">{j.role}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

const PHASES: { key: Phase; label: string; from: number; to?: number }[] = [
  { key: "registration", label: "Registration", from: HACKATHON.dates.registration, to: HACKATHON.dates.start },
  { key: "live", label: "Build & vote", from: HACKATHON.dates.start, to: HACKATHON.dates.end },
  { key: "judging", label: "Judging", from: HACKATHON.dates.end, to: HACKATHON.dates.results },
  { key: "results", label: "Results", from: HACKATHON.dates.results },
];

export function Timeline() {
  const { phase } = useHackathon();
  const at = PHASES.findIndex((p) => p.key === phase);
  return (
    <section id="dates" aria-labelledby="dates-title" className={SECTION}>
      <LandingSectionHeader id="dates-title" eyebrow="Key dates" title="Timeline" lead={`All times in ${HACKATHON.timezone}.`} />
      <ol className="m-0 mt-16 grid list-none grid-cols-1 gap-8 p-0 md:grid-cols-4">
        {PHASES.map((p, i) => {
          const now = i === at;
          const done = at > i;
          return (
            <li key={p.key} aria-current={now ? "step" : undefined} className={cn("relative flex flex-col gap-4 rounded-2xl px-8 py-10", GLASS, now && "border-[color:color-mix(in_srgb,var(--color-violet-400)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--color-violet-600)_14%,transparent)]")}>
              <span className="flex items-center gap-4">
                <span
                  aria-hidden
                  className={cn(
                    "flex size-[24px] items-center justify-center rounded-full text-sm font-semibold",
                    now ? "bg-[var(--color-button-primary-bg)] text-[color:var(--color-white)]" : done ? "bg-[color:color-mix(in_srgb,var(--color-white)_16%,transparent)] text-[color:var(--color-text-primary)]" : "border border-solid border-[color:color-mix(in_srgb,var(--color-white)_20%,transparent)] text-[color:var(--color-text-tertiary)]",
                  )}
                >
                  {done ? "✓" : i + 1}
                </span>
                <span className={cn("text-sm font-medium leading-sm", now ? "text-[color:var(--color-text-brand)]" : "text-[color:var(--color-text-tertiary)]")}>{now ? "Now" : done ? "Done" : "Next"}</span>
              </span>
              <span className="text-2xl font-semibold leading-2xl text-[color:var(--color-text-primary)]">{p.label}</span>
              <span className="text-md leading-md text-[color:var(--color-text-secondary)]">{p.to ? `${eat(p.from)} – ${eat(p.to)}` : `From ${eat(p.from)}`}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function FaqAndRules() {
  const faq: [string, string][] = [
    ["Is it free to take part?", "Yes. Joining is free, and every participant builds with IDEEZA AI on Low quality."],
    ["Do I need a crypto wallet or KYC?", "No. You can build, publish and vote without a wallet and without KYC."],
    ["How do votes count?", `Each person has ${HACKATHON.votesPerPerson} votes. Only signed-in users with a verified account can vote.`],
    ["Who owns my design?", "You do. Participants keep full ownership of their designs and intellectual property."],
    ["When are the winners announced?", `The hackathon ends on ${eat(HACKATHON.dates.end)} (EAT). The winners are published on this page after judging.`],
  ];
  return (
    <section id="faq" aria-label="Questions and rules" className={SECTION}>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[3fr_2fr]">
        <div className="flex flex-col gap-8">
          <LandingEyebrow className="self-start">FAQ</LandingEyebrow>
          <h2 className="font-display text-5xl font-semibold leading-5xl tracking-close text-[color:var(--color-text-primary)]">Questions and answers</h2>
          <div className="flex flex-col gap-4">
            {faq.map(([qq, a]) => (
              <details key={qq} className={cn("group rounded-2xl px-8", GLASS)}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-8 py-8 text-lg font-semibold leading-lg text-[color:var(--color-text-primary)] [&::-webkit-details-marker]:hidden">
                  {qq}
                  <span aria-hidden className="text-2xl leading-none text-[color:var(--color-text-tertiary)] transition-transform duration-fast group-open:rotate-45">+</span>
                </summary>
                <p className="pb-8 text-md leading-md text-[color:var(--color-text-secondary)]">{a}</p>
              </details>
            ))}
          </div>
        </div>
        <div className={cn("flex flex-col gap-8 self-start rounded-2xl px-8 py-12 md:px-12", GLASS)}>
          <LandingEyebrow className="self-start">Rules</LandingEyebrow>
          <h2 className="font-display text-5xl font-semibold leading-5xl tracking-close text-[color:var(--color-text-primary)]">Terms of participation</h2>
          <p className="text-md leading-md text-[color:var(--color-text-secondary)]">{HACKATHON.rules}</p>
          <ul className="m-0 flex list-none flex-wrap gap-4 p-0">
            {[`${HACKATHON.votesPerPerson} votes per person`, "Voters verify with email", "One account per person"].map((c) => (
              <li key={c} className={cn("rounded-full px-6 py-3 text-sm font-medium leading-sm text-[color:var(--color-text-secondary)]", GLASS)}>
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function Closing() {
  return (
    <section aria-labelledby="closing-title" className="relative isolate overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[520px] w-[980px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-violet-600)_32%,transparent),transparent)]" />
      <div className="mx-auto flex w-full max-w-[980px] flex-col items-center px-8 py-40 text-center [text-wrap:balance] md:py-[140px]">
        <LandingEyebrow>The creator economy meets hardware</LandingEyebrow>
        <h2 id="closing-title" className="mt-12 font-display text-6xl font-semibold leading-6xl tracking-snug text-[color:var(--color-text-primary)]">
          The next hardware product could be yours.
        </h2>
        <p className="mt-12 text-2xl leading-[30px] text-[color:var(--color-text-secondary)]">Build hardware at the speed of software. One prompt gives you a 3D prototype, a PCB and the code that runs it.</p>
        <div className="mt-16 flex flex-wrap justify-center gap-8">
          <JoinButton />
          <VoteLink />
        </div>
      </div>
    </section>
  );
}
