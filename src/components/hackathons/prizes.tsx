"use client";

// The prizes as a podium (owner 2026-11-16: the reference podium's design —
// solid 3D steps with a lit top face and the place number on the front, the
// person standing on each, a trophy over first — in our colours). On each
// step stands whoever holds that place on the board right now: their
// product's picture (no people photos exist), their name, and the prize the
// place pays. Steps: 2nd · 1st · 3rd, first the tallest, all violet-lit
// glass, first lit the most. The extras (giveaways, the AI unlock) sit under
// it as what everyone can win along the way.

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ChampionIcon, GiftIcon, SparklesIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { inWords, type Campaign } from "@/lib/hackathons/vibe-inventing";
import { useHackathon, useReducedMotion } from "./context";
import { HERO_MEDIA, Heading, Initials, SECTION, SURFACE } from "./parts";

// Visual order on the podium: 2nd · 1st · 3rd (the list itself stays 1st → 3rd for screen readers).
const ORDER = ["order-2", "order-1", "order-3"];
// Front-face heights, phone → wide.
const STEP = ["h-[176px] md:h-[300px]", "h-[124px] md:h-[216px]", "h-[96px] md:h-[164px]"];
const PLACE = ["1st place", "2nd place", "3rd place"];

/**
 * The section's background (owner 2026-11-16: the background from their brief,
 * nothing else on the section changes): the brief's particle-ribbon video at
 * full strength, no scrim, the full width of the page, graded into the site's
 * violet-to-blue on its deep navy. Only its top and bottom
 * edges are masked into the page so the section has no seam. It loads when
 * the section comes near; with reduced motion one frame of it holds still.
 */
function PrizesBackdrop() {
  const still = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const [near, setNear] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e?.isIntersecting && setNear(true), { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 -z-10 w-screen -translate-x-1/2 overflow-hidden bg-[var(--color-bg-page)] [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)]">
      {/* Graded into the site's colours (owner: the white ribbon on pure black did not match the
          rest of the site): inside the group, a violet-to-blue multiply layer tints the white
          ribbon and leaves its black black; the group is screen-blended onto the page's own
          deep navy, so that black becomes the page colour. No scrim — the light stays at full strength. */}
      {near ? (
        <div className="absolute inset-0 isolate mix-blend-screen">
          {still ? (
            <video src={`${HERO_MEDIA.ribbon}#t=2`} muted playsInline preload="auto" className="h-full w-full object-cover" />
          ) : (
            <video src={HERO_MEDIA.ribbon} autoPlay muted loop playsInline className="h-full w-full object-cover" />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(100deg,var(--color-violet-500)_0%,var(--color-violet-400)_35%,var(--color-violet-300)_60%,var(--color-blue-400)_100%)] mix-blend-multiply" />
        </div>
      ) : null}
    </div>
  );
}

// How the winner is decided, in one sentence under the heading (the campaign's Winner setting).
const decidedOf = ({ HACKATHON }: Campaign) =>
  HACKATHON.winBy === "shortlist"
    ? `The board's top ${HACKATHON.shortlist} go to the judges, and the judges pick the winners.`
    : HACKATHON.winBy === "score"
      ? `The judges' scores count for ${HACKATHON.judgesWeight}% and the votes for ${100 - HACKATHON.judgesWeight}%.`
      : "The most points win.";

// What everyone can win along the way, when the campaign has it.
const extrasOf = ({ HACKATHON }: Campaign) => [
  HACKATHON.giveaways && {
    icon: GiftIcon,
    title: `Giveaways every ${HACKATHON.giveaways.everyDays} days`,
    text: `${HACKATHON.giveaways.prize}, given out every ${HACKATHON.giveaways.everyDays} days while the hackathon runs.`,
  },
  HACKATHON.aiUnlock && {
    icon: SparklesIcon,
    title: `Better AI for the top ${HACKATHON.aiUnlock.top}`,
    text: `In the last ${HACKATHON.aiUnlock.lastDays} days the top ${HACKATHON.aiUnlock.top} build on ${HACKATHON.aiUnlock.quality} quality instead of ${HACKATHON.baseQuality}.`,
  },
].filter((x) => !!x);

export function Prizes() {
  const { c, board, openProject, phase } = useHackathon();
  const { HACKATHON, money, prizePool } = c;
  const places = inWords(HACKATHON.prizes.length);
  const DECIDED = decidedOf(c);
  const EXTRAS = extrasOf(c);
  // Who stands on the steps: nobody before building starts; the final standings once it has ended.
  const lead = !board.length
    ? DECIDED
    : phase === "judging" || phase === "results"
      ? `Building has ended: these ${places} finished on top. ${DECIDED}`
      : `If building ended now, these ${places} would stand here. ${DECIDED}`;
  return (
    <section id="prizes" aria-labelledby="prizes-title" className={cn(SECTION, "relative isolate")}>
      <PrizesBackdrop />
      <Heading className="[text-shadow:0_2px_18px_rgba(0,0,0,0.85)]" id="prizes-title" title={`${money(prizePool)} for the top ${places}`} lead={lead} />

      <ol className="m-0 mx-auto mt-24 grid max-w-[960px] list-none grid-cols-3 items-end p-0 md:mt-32">
        {HACKATHON.prizes.map((amount, i) => {
          const first = i === 0;
          const r = board.at(i);
          return (
            <li key={i} aria-label={`${PLACE.at(i)}: ${money(amount)}${r ? `, now ${r.p.name}` : ""}`} className={cn("relative flex min-w-0 flex-col items-center", ORDER.at(i), first && "z-[1]")}>
              {/* Who stands here now. */}
              <div className="flex w-full min-w-0 flex-col items-center gap-4 px-1 pb-8 text-center md:gap-5 md:pb-10">
                {first ? (
                  <HugeiconsIcon icon={ChampionIcon} size={44} strokeWidth={1.6} aria-hidden className="text-[color:var(--color-violet-300)] drop-shadow-[0_0_18px_color-mix(in_srgb,var(--color-violet-500)_80%,transparent)]" />
                ) : null}
                {r ? (
                  <button
                    type="button"
                    disabled={!r.p.project}
                    onClick={() => openProject(r)}
                    aria-label={r.p.project ? `Open ${r.p.project.name}, by ${r.p.name}` : r.p.name}
                    className={cn(
                      "relative shrink-0 overflow-hidden rounded-full border-0 p-0 ring-2 ring-offset-4 ring-offset-[var(--color-bg-page)] focus-visible:outline-none focus-visible:shadow-focus-brand disabled:cursor-default",
                      first ? "size-[72px] ring-[color:var(--color-violet-400)] md:size-[104px]" : "size-[60px] ring-[color:color-mix(in_srgb,var(--color-violet-300)_45%,transparent)] md:size-[88px]",
                    )}
                  >
                    {r.p.project ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.p.project.thumb} alt="" className="h-full w-full bg-[var(--color-bg-subtle)] object-cover" />
                    ) : (
                      <Initials name={r.p.name} className="h-full w-full text-xl" />
                    )}
                  </button>
                ) : null}
                <span className="max-w-full truncate rounded-xl bg-[color:color-mix(in_srgb,var(--color-black)_50%,transparent)] px-2 py-1 text-lg max-md:whitespace-normal max-md:[overflow-wrap:anywhere] font-medium leading-lg text-[color:var(--color-white)] backdrop-blur-[8px] md:px-3 md:text-2xl md:leading-2xl">{r ? r.p.name : PLACE.at(i)}</span>
                <span className="rounded-xl border border-solid border-[color:color-mix(in_srgb,var(--color-white)_14%,transparent)] bg-[color:color-mix(in_srgb,var(--color-black)_62%,transparent)] px-3 py-1 backdrop-blur-[8px] text-md font-semibold leading-md tabular-nums text-[color:var(--color-white)] md:px-5 md:py-2 md:text-xl md:leading-xl">
                  {amount.toLocaleString("en-US")} <span className="font-regular text-[color:var(--color-text-secondary)]">{HACKATHON.currency}</span>
                </span>
              </div>

              {/* The step: a lit top face, then the front with the place number, fading into the page at its foot. */}
              <div aria-hidden className="w-full [mask-image:linear-gradient(to_bottom,black_60%,transparent)]">
                <div
                  className={cn(
                    "h-[18px] w-full [clip-path:polygon(7%_0,93%_0,100%_100%,0_100%)] md:h-[30px]",
                    first
                      ? "bg-[linear-gradient(to_bottom,color-mix(in_srgb,var(--color-violet-200)_60%,transparent),color-mix(in_srgb,var(--color-violet-400)_45%,transparent))]"
                      : "bg-[linear-gradient(to_bottom,color-mix(in_srgb,var(--color-white)_30%,transparent),color-mix(in_srgb,var(--color-violet-300)_18%,transparent))]",
                  )}
                />
                <div
                  className={cn(
                    "flex w-full items-start justify-center pt-6 md:pt-12",
                    STEP.at(i),
                    first
                      ? "bg-[linear-gradient(to_bottom,color-mix(in_srgb,var(--color-violet-500)_42%,transparent),color-mix(in_srgb,var(--color-violet-800)_18%,transparent))] shadow-[0_-30px_90px_-10px_color-mix(in_srgb,var(--color-violet-600)_45%,transparent)]"
                      : "bg-[linear-gradient(to_bottom,color-mix(in_srgb,var(--color-violet-300)_16%,transparent),color-mix(in_srgb,var(--color-violet-900)_8%,transparent))]",
                  )}
                >
                  <span className="bg-[linear-gradient(to_bottom,var(--color-white),color-mix(in_srgb,var(--color-violet-200)_45%,transparent))] bg-clip-text font-display text-7xl font-semibold leading-7xl text-transparent [-webkit-background-clip:text] md:text-8xl md:leading-8xl">{i + 1}</span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {EXTRAS.length ? (
        <ul className="m-0 mx-auto mt-16 grid max-w-[960px] list-none grid-cols-1 gap-6 p-0 md:mt-20 md:grid-cols-2 md:gap-10">
          {EXTRAS.map((x) => (
            <li key={x.title} className={cn("flex items-start gap-8 rounded-2xl px-10 py-10 md:px-12", SURFACE)}>
              <span className="flex size-[44px] shrink-0 items-center justify-center rounded-xl bg-[color:color-mix(in_srgb,var(--color-violet-600)_22%,transparent)] text-[color:var(--color-violet-200)]">
                <HugeiconsIcon icon={x.icon} size={22} strokeWidth={1.8} />
              </span>
              <span className="flex flex-col gap-3">
                <span className="text-xl font-semibold leading-xl text-[color:var(--color-text-primary)]">{x.title}</span>
                <span className="text-lg leading-lg text-[color:var(--color-text-secondary)]">{x.text}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
