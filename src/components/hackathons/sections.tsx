"use client";

// The hackathon page's quieter sections and its sticky bar:
//  - SectionNav: one site top bar, then this page's own anchors and Join;
//  - WhoAndJudging: who can enter, and how the winner is picked (a weighted
//    bar, not three loose chips), side by side with a hairline between;
//  - Timeline: one track across the four phases, filled up to now;
//  - FaqAndRules: questions as a ruled list, the terms beside them;
//  - Closing: full screen over a wall of the builds — the clock and Join again.

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { HACKATHON, money, prizePool, type Phase } from "@/lib/hackathons/vibe-inventing";
import { countdownParts, eat, useHackathon, useReducedMotion } from "./context";
import { JoinButton, VoteLink } from "./actions";
import { Heading, Initials, SECTION } from "./parts";

const ANCHORS = [
  ["prizes", "Prizes"],
  ["how", "How to win"],
  ["leaderboard", "Leaderboard"],
  ["vote", "Vote"],
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
    <div className="sticky top-[80px] z-[5] border-0 border-y border-solid border-[color:color-mix(in_srgb,var(--color-white)_8%,transparent)] bg-[color:color-mix(in_srgb,var(--color-bg-page)_86%,transparent)] backdrop-blur-[24px]">
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

const CRITERIA_FILL = ["bg-[var(--color-violet-600)]", "bg-[var(--color-violet-400)]", "bg-[var(--color-blue-400)]"];

export function WhoAndJudging() {
  const who = [
    `${HACKATHON.minAge} or older, living in ${HACKATHON.where}`,
    "University students, makers, engineers and anyone with a product idea",
    "You compete on your own, for your university or the open category",
    "One IDEEZA account per person, with a verified email",
    "Judges cannot take part or vote",
  ];
  return (
    <section aria-label="Who can join and how the winner is picked" className={SECTION}>
      <div className="grid grid-cols-1 gap-20 lg:grid-cols-2 lg:gap-0">
        <div className="flex flex-col gap-10 lg:pr-20">
          <h2 className="font-display text-5xl font-semibold leading-5xl tracking-snug text-[color:var(--color-text-primary)] md:text-6xl md:leading-6xl">Who can join</h2>
          <ul className="m-0 flex list-none flex-col gap-6 p-0">
            {who.map((w) => (
              <li key={w} className="flex items-start gap-5 text-lg leading-lg text-[color:var(--color-text-secondary)]">
                <span aria-hidden className="mt-[2px] flex size-[24px] shrink-0 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--color-green-400)_16%,transparent)] text-[color:var(--color-green-400)]">
                  <HugeiconsIcon icon={Tick02Icon} size={14} strokeWidth={2.4} />
                </span>
                {w}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-10 border-0 border-solid border-[color:color-mix(in_srgb,var(--color-white)_10%,transparent)] lg:border-l lg:pl-20">
          <h2 className="font-display text-5xl font-semibold leading-5xl tracking-snug text-[color:var(--color-text-primary)] md:text-6xl md:leading-6xl">How the winner is picked</h2>
          <p className="text-lg leading-lg text-[color:var(--color-text-secondary)]">
            When building ends the board freezes. The <b className="font-semibold text-[color:var(--color-text-primary)]">top {HACKATHON.shortlist}</b> are shortlisted, and the judges score each one on:
          </p>
          <div>
            <div className="flex h-[48px] w-full gap-1 overflow-hidden rounded-xl" role="img" aria-label={HACKATHON.criteria.map((c) => `${c.name} ${c.weight}%`).join(", ")}>
              {HACKATHON.criteria.map((c, i) => (
                <div key={c.name} style={{ flexGrow: c.weight }} className={cn("flex basis-0 items-center px-5 text-md font-semibold leading-md text-[color:var(--color-white)]", CRITERIA_FILL.at(i))}>
                  {c.weight}%
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-x-10 gap-y-3 text-md leading-md text-[color:var(--color-text-primary)]">
              {HACKATHON.criteria.map((c, i) => (
                <span key={c.name} className="inline-flex items-center gap-3">
                  <span aria-hidden className={cn("size-[10px] rounded-full", CRITERIA_FILL.at(i))} />
                  {c.name}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-5">
            <span className="text-md font-medium leading-md text-[color:var(--color-text-secondary)]">The judges</span>
            <ul className="m-0 flex list-none flex-wrap gap-x-10 gap-y-6 p-0">
              {HACKATHON.judges.map((j) => (
                <li key={j.name} className="flex items-center gap-4">
                  <Initials name={j.name} className="size-[44px] text-md" />
                  <span className="flex flex-col">
                    <span className="text-md font-semibold leading-md text-[color:var(--color-text-primary)]">{j.name}</span>
                    <span className="text-sm leading-sm text-[color:var(--color-text-tertiary)]">{j.role}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

const PHASES: { key: Phase; label: string; from: number; to: number | null }[] = [
  { key: "registration", label: "Registration", from: HACKATHON.dates.registration, to: HACKATHON.dates.start },
  { key: "live", label: "Build & vote", from: HACKATHON.dates.start, to: HACKATHON.dates.end },
  { key: "judging", label: "Judging", from: HACKATHON.dates.end, to: HACKATHON.dates.results },
  { key: "results", label: "Winners announced", from: HACKATHON.dates.results, to: null },
];

/**
 * The four phases on one track. Each phase owns an equal stretch; the fill
 * runs through the finished ones and into the current one as far as its time
 * has gone, so "where are we" is read from the line itself.
 */
export function Timeline() {
  const { now, phase } = useHackathon();
  const at = PHASES.findIndex((p) => p.key === phase);
  const part = (() => {
    if (now === null || at < 0) return 0;
    const p = PHASES.at(at);
    if (!p || p.to === null) return 1;
    return Math.min(1, Math.max(0, (now - p.from) / (p.to - p.from)));
  })();
  // Phase i's node sits at the start of its stretch; the last node closes the track.
  const fill = at < 0 ? 0 : Math.min(100, ((at + part) / (PHASES.length - 1)) * 100);

  return (
    <section id="dates" aria-labelledby="dates-title" className={SECTION}>
      <Heading id="dates-title" title="Dates" lead={`All times in ${HACKATHON.timezone}.`} />
      <div className="relative mt-20">
        {/* The track: down the left on a phone, across on wider screens. */}
        <div aria-hidden className="absolute bottom-[12px] left-[11px] top-[12px] w-[2px] bg-[color:color-mix(in_srgb,var(--color-white)_12%,transparent)] md:bottom-auto md:left-[12px] md:right-[12px] md:h-[2px] md:w-auto">
          <div className="h-[var(--fill)] w-full bg-[var(--color-violet-400)] md:h-full md:w-[var(--fill)]" style={{ ["--fill" as string]: `${fill}%` }} />
        </div>
        <ol className="relative m-0 grid list-none grid-cols-1 gap-12 p-0 md:grid-cols-4 md:gap-8">
          {PHASES.map((p, i) => {
            const isNow = i === at;
            const done = at > i;
            return (
              <li key={p.key} aria-current={isNow ? "step" : undefined} className="flex gap-6 md:flex-col md:gap-8">
                <span
                  aria-hidden
                  className={cn(
                    "relative flex size-[24px] shrink-0 items-center justify-center rounded-full",
                    isNow
                      ? "bg-[var(--color-violet-400)] shadow-[0_0_0_6px_color-mix(in_srgb,var(--color-violet-400)_24%,transparent)]"
                      : done
                        ? "bg-[var(--color-violet-400)]"
                        : "border-2 border-solid border-[color:color-mix(in_srgb,var(--color-white)_24%,transparent)] bg-[var(--color-bg-page)]",
                  )}
                >
                  {done ? <HugeiconsIcon icon={Tick02Icon} size={14} strokeWidth={2.6} className="text-[color:var(--color-white)]" /> : null}
                </span>
                <span className="flex flex-col gap-2">
                  <span className={cn("text-sm font-semibold leading-sm", isNow ? "text-[color:var(--color-violet-300)]" : "text-[color:var(--color-text-tertiary)]")}>{isNow ? "Now" : done ? "Done" : "Next"}</span>
                  <span className="text-2xl font-semibold leading-2xl text-[color:var(--color-text-primary)]">{p.label}</span>
                  <span className="text-md leading-md text-[color:var(--color-text-secondary)]">{p.to ? `${eat(p.from)} – ${eat(p.to)}` : eat(p.from)}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

export function FaqAndRules() {
  const faq: [string, string][] = [
    ["Is it free to take part?", "Yes. Joining is free, and every participant builds with IDEEZA AI on Low quality."],
    ["I have never built hardware. Can I still take part?", "Yes. No engineering background is needed: you describe the idea in plain words and IDEEZA AI designs the concept, PCB, code and 3D."],
    ["Do I need a crypto wallet or KYC?", "No. You can build, publish and vote without a wallet and without KYC."],
    ["How do votes count?", `Each account has ${HACKATHON.votesPerPerson} votes and can take one back while voting is open. Only signed-in accounts with a verified email can vote.`],
    ["Who owns my design?", "You do. Participants keep full ownership of their designs and intellectual property."],
    ["When are the winners announced?", `Building ends on ${eat(HACKATHON.dates.end)} (EAT). The winners are published on this page on ${eat(HACKATHON.dates.results)}.`],
  ];
  return (
    <section id="faq" aria-labelledby="faq-title" className={SECTION}>
      <div className="grid grid-cols-1 gap-20 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-24">
        <div>
          <Heading id="faq-title" title="Questions" />
          <div className="mt-12 border-0 border-b border-solid border-[color:color-mix(in_srgb,var(--color-white)_10%,transparent)]">
            {faq.map(([q, a]) => (
              <details key={q} className="group border-0 border-t border-solid border-[color:color-mix(in_srgb,var(--color-white)_10%,transparent)]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-8 py-8 text-xl font-semibold leading-xl text-[color:var(--color-text-primary)] [&::-webkit-details-marker]:hidden">
                  {q}
                  <span aria-hidden className="flex size-[32px] shrink-0 items-center justify-center rounded-full border border-solid border-[color:color-mix(in_srgb,var(--color-white)_16%,transparent)] text-xl leading-none text-[color:var(--color-text-secondary)] transition-transform duration-fast group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="max-w-[640px] pb-8 text-lg leading-lg text-[color:var(--color-text-secondary)]">{a}</p>
              </details>
            ))}
          </div>
        </div>
        <aside aria-labelledby="rules-title" className="flex flex-col gap-8 self-start lg:sticky lg:top-[176px] lg:pt-[12px]">
          <h2 id="rules-title" className="text-2xl font-semibold leading-2xl text-[color:var(--color-text-primary)]">
            Terms of participation
          </h2>
          <p className="text-md leading-md text-[color:var(--color-text-secondary)]">{HACKATHON.rules}</p>
          <ul className="m-0 flex list-none flex-wrap gap-3 p-0">
            {[`${HACKATHON.votesPerPerson} votes per account`, "Verified email to vote", "One account per person"].map((c) => (
              <li key={c} className="rounded-full border border-solid border-[color:color-mix(in_srgb,var(--color-white)_14%,transparent)] px-5 py-2 text-sm font-medium leading-sm text-[color:var(--color-text-secondary)]">
                {c}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}

// The wall comes in two cuts: 3 × 3 wide for screens from 768 px, 2 × 6 tall for
// phones (the wide one, cropped to a phone, showed one giant tile).
const WALL = {
  wide: { video: "/hackathons/closing-wall.mp4", poster: "/hackathons/closing-wall.jpg" },
  tall: { video: "/hackathons/closing-wall-phone.mp4", poster: "/hackathons/closing-wall-phone.jpg" },
};
const WIDE = "(min-width: 768px)";
function subscribeWide(on: () => void) {
  const q = window.matchMedia(WIDE);
  q.addEventListener("change", on);
  return () => q.removeEventListener("change", on);
}

/** "Building ends in 6 days · 08:04:38" — the closing line's clock, one line of caps. */
function closingClock(phase: Phase | null, now: number | null): string {
  if (phase === "judging" || phase === "results") return `Building has ended · winners on ${eat(HACKATHON.dates.results)}`;
  const to = phase === "registration" || phase === "soon" ? HACKATHON.dates.start : HACKATHON.dates.end;
  const t = countdownParts(to, now);
  const days = Number(t.d);
  return `Building ${phase === "registration" || phase === "soon" ? "starts" : "ends"} in ${Number.isNaN(days) ? "--" : days} ${days === 1 ? "day" : "days"} · ${t.h}:${t.m}:${t.s}`;
}

/**
 * The last word, full screen (owner 2026-11-16: the concept from their brief,
 * in our fonts, colours and words). Behind it, a wall of the builds — product
 * clips in one loop (`public/hackathons/closing-wall*.mp4`: 3 × 3 wide, 2 × 6
 * for phones, made with ffmpeg from the Innovations clips with their caption
 * strips cropped), darkened and
 * washed in violet so the words own the screen. On it: the promise and the
 * prize in two short lines, the clock in one line of caps, the headline with
 * its second line shining, and Join with an arrow that steps forward. The
 * clip loads only when the section is near, and stays a still picture for
 * reduced motion. It fills the screen under the site bar and section bar.
 */
export function Closing() {
  const { now, phase } = useHackathon();
  const still = useReducedMotion();
  const wide = React.useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE).matches, () => true);
  const cut = wide ? WALL.wide : WALL.tall;
  const ref = React.useRef<HTMLElement>(null);
  const [near, setNear] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e?.isIntersecting && setNear(true), { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} aria-labelledby="closing-title" className="relative isolate flex min-h-[calc(100svh-140px)] flex-col overflow-hidden">
      <div aria-hidden className="absolute inset-0 -z-10">
        <picture>
          <source media={WIDE} srcSet={WALL.wide.poster} />
          <img src={WALL.tall.poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
        </picture>
        {near && !still ? <video key={cut.video} src={cut.video} poster={cut.poster} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" /> : null}
        {/* Darken, wash in violet, and fade both edges into the page. */}
        <div className="absolute inset-0 bg-[color:color-mix(in_srgb,var(--color-bg-page)_74%,transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(60%_55%_at_50%_58%,color-mix(in_srgb,var(--color-violet-700)_55%,transparent),transparent)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,var(--color-bg-page)_0%,transparent_22%,transparent_78%,var(--color-bg-page)_100%)]" />
      </div>

      <div className="mx-auto flex w-full max-w-[1260px] flex-1 flex-col px-8 pb-24 pt-20 md:pt-24 xl:px-0">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-16">
          <p className="max-w-[440px] text-md leading-md text-[color:color-mix(in_srgb,var(--color-white)_80%,transparent)] md:text-lg md:leading-lg">
            {HACKATHON.minProducts} products in 160 hours. No engineering background needed: describe an idea, and IDEEZA AI designs the concept, PCB, code and 3D.
          </p>
          <p className="text-md leading-md text-[color:color-mix(in_srgb,var(--color-white)_80%,transparent)] md:text-lg md:leading-lg lg:text-right">
            <b className="font-semibold text-[color:var(--color-white)]">{money(prizePool)}</b> in prizes
            <br className="hidden lg:block" /> for the top three.
          </p>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center py-24 text-center">
          <p className="text-sm font-medium uppercase leading-sm tracking-caps tabular-nums text-[color:color-mix(in_srgb,var(--color-white)_80%,transparent)] md:text-md md:leading-md">{closingClock(phase, now)}</p>
          <h2 id="closing-title" className="mt-10 font-display text-6xl leading-6xl tracking-tighter [text-wrap:balance] md:text-8xl md:leading-8xl">
            <span className="block font-medium text-[color:var(--color-white)]">Put your university</span>
            <span className="ix-hack-shine block font-bold">on the board.</span>
          </h2>
          <div className="mt-16 flex w-full flex-col items-center gap-8 sm:w-auto sm:flex-row">
            <JoinButton tone="inverse" arrow className="w-full sm:w-auto" />
            <VoteLink className="w-full sm:w-auto" />
          </div>
        </div>
      </div>
    </section>
  );
}
