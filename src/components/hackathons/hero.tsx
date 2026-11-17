"use client";

// The hackathon's opening, built from the owner's "Zapline" hero brief
// (2026-11-16) with our words, fonts and colours: a black starfield with the
// glowing violet rim of a giant planet arching across the top (the brief's
// own glow video, screen-blended so its black disappears), a big centred
// headline under it, the lede and the two actions, and a dark violet-edged
// panel rising from the bottom with a light line along its top edge. The
// panel holds the page's own particle hologram — an idea becoming a PCB
// becoming a product (hero-showcase.tsx), not an app, not the page's product
// photos, not art the landing page already shows (owner).
//
// Sky: the stars are drawn once on a canvas; nothing in the sky is animated
// in code — only the video moves it. The video plays on wide landscape
// screens (≥ 900 px) and fades in when ready; until then, on phones and with
// reduced motion, a painted rim stands in for it.
//
// Entrance: one timeline (globals.css .ix-hk-*): the status line fades in, the
// headline wipes up line by line, then the lede and buttons, then the panel
// rises with its stage.

import * as React from "react";
import { cn } from "@/lib/utils";
import type { Phase } from "@/lib/hackathons/vibe-inventing";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { countdownParts, useHackathon, useReducedMotion } from "./context";
import { JoinButton, VoteLink } from "./actions";
import { HeroShowcase } from "./hero-showcase";
import { HERO_MEDIA } from "./parts";

const STATUS: Record<Phase, string> = {
  soon: "Registration opens soon",
  registration: "Registration is open",
  live: "Live now",
  judging: "Building has ended · judging",
  results: "Winners announced",
};

const DESKTOP = "(min-width: 900px) and (orientation: landscape)";
function subscribeDesktop(on: () => void) {
  const q = window.matchMedia(DESKTOP);
  q.addEventListener("change", on);
  return () => q.removeEventListener("change", on);
}

/** Procedural stars: white dots of a few sizes, drawn once per size of the box. */
function Stars() {
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const draw = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = c.clientWidth;
      const h = c.clientHeight;
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      const g = c.getContext("2d");
      if (!g) return;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      // A fixed seed: the same sky on every visit.
      let a = 1337;
      const rnd = () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      const n = Math.round((w * h) / 2600);
      for (let i = 0; i < n; i++) {
        const r = rnd() < 0.92 ? 0.35 + rnd() * 0.55 : 0.9 + rnd() * 0.7;
        g.globalAlpha = 0.25 + rnd() * 0.7;
        g.fillStyle = "#ffffff";
        g.beginPath();
        g.arc(rnd() * w, rnd() * h, r, 0, Math.PI * 2);
        g.fill();
      }
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(c);
    return () => ro.disconnect();
  }, []);
  return <canvas ref={ref} aria-hidden className="absolute inset-0 h-full w-full" />;
}

/**
 * The planet: the brief's glow video on wide screens, a painted rim
 * elsewhere (and until the video can play). Both are screen-blended, so
 * their black is see-through and the stars show around the glow.
 */
function Planet() {
  const still = useReducedMotion();
  const desktop = React.useSyncExternalStore(subscribeDesktop, () => window.matchMedia(DESKTOP).matches, () => false);
  const [ready, setReady] = React.useState(false);
  const playing = desktop && !still;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0">
      {/* The painted rim: the lower edge of a huge dark planet, lit violet. */}
      <div className={cn("transition-opacity duration-slower", playing && ready ? "opacity-0" : "opacity-100")}>
        {/* Its lowest point sits just under the site bar: ~150 px on a phone (a smaller planet, so the curve shows), ~190 px wider. */}
        <div className="absolute left-1/2 top-[-750px] size-[900px] -translate-x-1/2 rounded-full bg-[var(--color-black)] shadow-[0_2px_0_0_color-mix(in_srgb,var(--color-violet-200)_70%,transparent),0_14px_40px_4px_color-mix(in_srgb,var(--color-violet-500)_70%,transparent),0_40px_140px_30px_color-mix(in_srgb,var(--color-violet-700)_55%,transparent)] md:top-[-1210px] md:size-[1400px] lg:top-[-1910px] lg:size-[2100px]" />
      </div>
      {playing ? (
        <video
          src={HERO_MEDIA.glow}
          autoPlay
          muted
          loop
          playsInline
          onCanPlay={() => setReady(true)}
          className={cn("absolute left-1/2 top-0 w-[max(100%,1240px)] -translate-x-1/2 mix-blend-screen transition-opacity duration-[800ms]", ready ? "opacity-100" : "opacity-0")}
        />
      ) : null}
    </div>
  );
}

export function HackathonHero() {
  const { c, phase, now, unit } = useHackathon();
  const { HACKATHON, GROUP, money, unitLabel, eat } = c;
  // The two facts a visitor needs beside Join (the brief's hero left them to the bottom of
  // the page): how long is left, and whether they can enter.
  const left = countdownParts(phase === "registration" || phase === "soon" ? HACKATHON.dates.start : HACKATHON.dates.end, now);
  const deadline =
    phase === "results"
      ? `Winners announced ${eat(HACKATHON.dates.results)}`
      : phase === "judging"
      ? `Winners on ${eat(HACKATHON.dates.results)}`
      : `${phase === "registration" || phase === "soon" ? "Starts" : "Ends"} in ${Number.isNaN(Number(left.d)) ? "--" : Number(left.d)}d ${left.h}h ${left.m}m`;
  // "Free to join" only while joining is open.
  const ended = phase === "judging" || phase === "results";
  const facts = [deadline, ...(ended ? [] : ["Free to join"]), `${HACKATHON.minAge}+, living in ${HACKATHON.where}`, unitLabel(unit)];
  return (
    <section aria-labelledby="hackathon-title" className="relative isolate overflow-hidden bg-[var(--color-black)]">
      <div aria-hidden className="absolute inset-0 -z-10">
        <Stars />
        {/* The page below is a deep navy, not black: the hero ends in it. */}
        <div className="absolute inset-x-0 bottom-0 h-[220px] bg-[linear-gradient(to_bottom,transparent,var(--color-bg-page))]" />
      </div>
      <div className="-z-10">
        <Planet />
      </div>

      <div className="mx-auto flex w-full max-w-[1260px] flex-col items-center px-8 pt-[200px] text-center md:pt-[236px] lg:pt-[260px] min-[1292px]:px-0">
        <p className="ix-hk-fade flex items-center gap-3 rounded-full border border-solid border-[color:color-mix(in_srgb,var(--color-violet-300)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--color-black)_55%,transparent)] px-5 py-2 text-md font-medium leading-md text-[color:color-mix(in_srgb,var(--color-white)_86%,transparent)] backdrop-blur-[6px] md:text-lg md:leading-lg">
          <span aria-hidden className={cn("size-[8px] shrink-0 rounded-full", phase === "live" ? "bg-[var(--color-green-400)] motion-safe:animate-pulse" : "bg-[var(--color-violet-400)]")} />
          <span>
            {phase ? STATUS[phase] : " "} · {/* phones: the short name, so the pill stays one line */}
            <span className="max-sm:hidden">{HACKATHON.name}</span>
            <span className="sm:hidden">{HACKATHON.shortName}</span>
          </span>
        </p>

        <h1 id="hackathon-title" className="mt-12 font-display text-6xl font-bold leading-6xl tracking-tighter text-[color:var(--color-white)] md:text-8xl md:leading-8xl">
          <span className="ix-hk-wipe block" style={{ animationDelay: "120ms" }}>
            <span className="bg-[linear-gradient(90deg,var(--color-violet-300),var(--color-violet-500))] bg-clip-text text-transparent [-webkit-background-clip:text]">Invent hardware</span> <span className="whitespace-nowrap">with AI.</span>
          </span>
          <span className="ix-hk-wipe block" style={{ animationDelay: "260ms" }}>
            Win {money(HACKATHON.prizes[0])}.
          </span>
        </h1>

        <p className="ix-hk-rise mt-12 max-w-[760px] text-xl leading-xl text-[color:var(--color-text-secondary)] [text-wrap:pretty] md:text-2xl md:leading-2xl" style={{ animationDelay: "420ms" }}>
          No engineering background needed. Describe an idea in plain words and IDEEZA AI designs the concept, PCB, code and 3D. Build {HACKATHON.minProducts} products in {HACKATHON.hours} hours{GROUP ? `, collect votes, and put your ${GROUP.one} on top.` : " and collect votes."}
        </p>

        <div className="ix-hk-rise mt-20 flex w-full flex-col items-center justify-center gap-6 sm:w-auto sm:flex-row md:mt-24" style={{ animationDelay: "540ms" }}>
          <JoinButton className="w-full transition-shadow duration-fast hover:shadow-[0_0_36px_color-mix(in_srgb,var(--color-violet-500)_70%,transparent)] sm:w-auto" />
          <VoteLink className="w-full sm:w-auto" />
        </div>
        <ul className="ix-hk-rise m-0 mt-10 flex list-none flex-wrap justify-center gap-x-10 gap-y-4 p-0 md:mt-12 text-md leading-md text-[color:var(--color-text-secondary)] md:text-lg md:leading-lg" style={{ animationDelay: "620ms" }}>
          {facts.map((f, i) => (
            <li key={f} className={cn("flex items-center gap-2", i === 0 && "font-semibold text-[color:var(--color-white)] tabular-nums")}>
              {i === 0 ? (
                <span aria-hidden className={cn("size-[8px] rounded-full", phase === "live" ? "bg-[var(--color-green-400)]" : "bg-[var(--color-violet-400)]")} />
              ) : (
                <HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={2.2} aria-hidden className="text-[color:var(--color-green-400)]" />
              )}
              {f}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative mx-auto mt-24 w-full max-w-[1236px] px-4 pb-24 md:mt-32 md:px-8 md:pb-32 xl:px-4">
        <HeroShowcase />
      </div>
    </section>
  );
}
