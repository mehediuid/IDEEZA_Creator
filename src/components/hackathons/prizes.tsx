"use client";

// The prizes as a podium (owner 2026-11-16: the reference podium's design —
// solid 3D steps with a lit top face and the place number on the front, a
// trophy over first — in our colours). Over each step, as the prototype's
// landing page has it (owner 2026-11-17: its content is final): the place and
// what it pays — a cup over first, a medal over the others. Steps: 2nd · 1st ·
// 3rd, first the tallest, all violet-lit glass, first lit the most. Further
// places and the extra rewards sit under it.

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ChampionIcon, GiftIcon, Medal01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import type { Campaign } from "@/lib/hackathons/vibe-inventing";
import { useHackathon, useReducedMotion } from "./context";
import { HERO_MEDIA, Heading, SECTION, SURFACE } from "./parts";

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

// Under the podium, as the prototype's landing page lists them: the places
// after the third, and the campaign's extra rewards.
const ORD = (n: number) => `${n}${n % 10 === 1 && n % 100 !== 11 ? "st" : n % 10 === 2 && n % 100 !== 12 ? "nd" : n % 10 === 3 && n % 100 !== 13 ? "rd" : "th"}`;
const extrasOf = ({ HACKATHON, money }: Campaign) => [
  ...HACKATHON.prizes.slice(3).map((a, i) => ({ icon: Medal01Icon, title: `${ORD(i + 4)} place`, text: money(a) })),
  ...(HACKATHON.extras ? [{ icon: GiftIcon, title: "Extra rewards", text: `${HACKATHON.extras}.` }] : []),
];

export function Prizes() {
  const { c } = useHackathon();
  const { HACKATHON, money, prizePool } = c;
  const EXTRAS = extrasOf(c);
  return (
    <section id="prizes" aria-labelledby="prizes-title" className={cn(SECTION, "relative isolate")}>
      <PrizesBackdrop />
      <Heading className="[text-shadow:0_2px_18px_rgba(0,0,0,0.85)]" id="prizes-title" title={`${money(prizePool)} in prizes`} />

      <ol className="m-0 mx-auto mt-24 grid max-w-[960px] list-none grid-cols-3 items-end p-0 md:mt-32">
        {HACKATHON.prizes.slice(0, 3).map((amount, i) => {
          const first = i === 0;
          return (
            <li key={i} aria-label={`${PLACE.at(i)}: ${money(amount)}`} className={cn("relative flex min-w-0 flex-col items-center", ORDER.at(i), first && "z-[1]")}>
              {/* The place and what it pays: a cup over first, a medal over the others. */}
              <div className="flex w-full min-w-0 flex-col items-center gap-4 px-1 pb-8 text-center md:gap-5 md:pb-10">
                <HugeiconsIcon
                  icon={first ? ChampionIcon : Medal01Icon}
                  size={first ? 44 : 36}
                  strokeWidth={1.6}
                  aria-hidden
                  className={cn(first ? "text-[color:var(--color-violet-300)] drop-shadow-[0_0_18px_color-mix(in_srgb,var(--color-violet-500)_80%,transparent)]" : "text-[color:var(--color-violet-200)]")}
                />
                <span className="max-w-full truncate rounded-xl bg-[color:color-mix(in_srgb,var(--color-black)_50%,transparent)] px-2 py-1 text-lg max-md:whitespace-normal max-md:[overflow-wrap:anywhere] font-medium leading-lg text-[color:var(--color-white)] backdrop-blur-[8px] md:px-3 md:text-2xl md:leading-2xl">{PLACE.at(i)}</span>
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
        <ul className={cn("m-0 mx-auto mt-16 grid list-none grid-cols-1 gap-6 p-0 md:mt-20 md:gap-10", EXTRAS.length > 1 ? "max-w-[960px] md:grid-cols-2" : "max-w-[560px]")}>
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
