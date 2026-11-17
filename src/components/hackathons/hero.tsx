"use client";

// The hackathon's opening, built from the owner's "Zapline" hero brief
// (2026-11-16) with our words, fonts and colours: a black starfield with the
// glowing violet rim of a giant planet arching across the top (the brief's
// own glow video, screen-blended so its black disappears), a big centred
// headline under it, the lede and the two actions, and a dark violet-edged
// panel rising from the bottom with a light line along its top edge. The
// panel holds the page's own particle hologram — concept, PCB, code, 3D
// (hero-showcase.tsx), not an app, not the page's product photos, not art the
// landing page already shows (owner). The words — the hackathon's name, its
// lead, the clock and the facts — are the prototype landing page's (owner
// 2026-11-17: that page's content is final).
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
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { countdownParts, useHackathon, useReducedMotion } from "./context";
import { JoinButton, VoteLink } from "./actions";
import { HeroShowcase } from "./hero-showcase";
import { HERO_MEDIA } from "./parts";

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

/**
 * The name over two lines, the first lit (the prototype's title: half the
 * words, rounded up, on top). "1 vs 1" counts as one word, so it never breaks.
 */
function titleLines(name: string): [string, string] {
  const w = name.trim().match(/\d+ vs \d+|\S+/g) ?? [];
  const k = w.length > 3 ? Math.ceil(w.length / 2) : Math.max(1, w.length - 1);
  return [w.slice(0, k).join(" "), w.slice(k).join(" ")];
}

/**
 * What a visitor must see first, right over Join (owner 2026-11-17: the
 * prize and the clock, premium — never a plain box). One stage in the hero's
 * own language: a hairline frame lit violet along its top edge (as the
 * hologram panel below), a soft violet bloom behind it, and no boxes inside.
 * Left, the prize: a small ruled "Prize pool" caption, the total in large
 * display numerals that count up when the page opens and catch a slow violet
 * light, and the three places' prizes under it. Right, the clock: open
 * numerals like an event countdown, each digit dropping into place as it
 * changes, the units in small caps under them; while it runs, a line of
 * light along the frame's foot shows how much of it has gone. A fine rule with a glowing
 * node between the two (a horizontal one on a phone, where they stack).
 * Once there is nothing to count, the clock's half says where the hackathon
 * stands. Reduced motion: no count-up, no drop, no light.
 */
function Ruled({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center justify-center gap-4 text-md font-semibold uppercase leading-md tracking-caps text-[color:var(--color-violet-200)]">
      <span aria-hidden className="h-px w-8 bg-[linear-gradient(to_right,transparent,color-mix(in_srgb,var(--color-violet-300)_70%,transparent))]" />
      {children}
      <span aria-hidden className="h-px w-8 bg-[linear-gradient(to_left,transparent,color-mix(in_srgb,var(--color-violet-300)_70%,transparent))]" />
    </span>
  );
}

/** The prize total, counting up from 0 once when the hero opens (written straight to the text, no re-render). */
function CountUp({ value }: { value: number }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const still = useReducedMotion();
  React.useEffect(() => {
    const el = ref.current;
    if (!el || still) return;
    const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
    el.textContent = fmt(0);
    let raf = 0;
    let start = 0;
    // After the panel's own entrance (it rises at 480 ms), 1.6 s, easing out.
    const delay = window.setTimeout(() => {
      const step = (t: number) => {
        if (!start) start = t;
        const k = Math.min(1, (t - start) / 1600);
        el.textContent = fmt(value * (1 - Math.pow(1 - k, 4)));
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, 650);
    return () => {
      window.clearTimeout(delay);
      cancelAnimationFrame(raf);
      el.textContent = fmt(value);
    };
  }, [value, still]);
  return <span ref={ref}>{value.toLocaleString("en-US")}</span>;
}

/** Two digits; each one that changes drops into place (keyed by its value). */
function Digits({ v }: { v: string }) {
  return (
    <span className="flex">
      {v.split("").map((d, i) => (
        <span key={i} className="relative inline-block w-[0.62em] overflow-hidden text-center">
          <span key={d} className="ix-hk-drop inline-block bg-[linear-gradient(180deg,var(--color-white)_30%,color-mix(in_srgb,var(--color-violet-200)_80%,var(--color-white)))] bg-clip-text text-transparent [-webkit-background-clip:text]">
            {d}
          </span>
        </span>
      ))}
    </span>
  );
}

function PrizeAndClock() {
  const { c, phase, now } = useHackathon();
  const { HACKATHON, prizePool, clockOf } = c;
  const clock = phase ? clockOf(phase) : null;
  const t = countdownParts(clock?.to ?? 0, now);
  const counting = clock === null || clock.to !== null;
  const units: [string, string][] = [
    [t.d, "Days"],
    [t.h, "Hours"],
    [t.m, "Minutes"],
    [t.s, "Seconds"],
  ];
  const PLACES = ["1st", "2nd", "3rd"];
  // While it runs, how much of the hackathon has gone, as a line of light along the frame's foot.
  const gone = phase === "live" && now !== null ? Math.min(1, Math.max(0, (now - HACKATHON.dates.start) / (HACKATHON.dates.end - HACKATHON.dates.start))) : null;
  return (
    <div className="ix-hk-rise relative mt-10 w-full max-w-[840px] md:mt-12" style={{ animationDelay: "480ms" }}>
      {/* The bloom behind the stage. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-[8%] -inset-y-6 -z-10 rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-violet-600)_42%,transparent),transparent)] blur-2xl" />
      {/* A hairline frame, brightest along the top edge, with the light line the hologram panel has. */}
      <div className="rounded-[28px] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-violet-300)_70%,transparent),color-mix(in_srgb,var(--color-white)_8%,transparent)_38%,color-mix(in_srgb,var(--color-white)_5%,transparent)_70%,color-mix(in_srgb,var(--color-violet-500)_40%,transparent))] p-px">
        <div className="relative isolate grid grid-cols-1 overflow-hidden rounded-[27px] bg-[radial-gradient(90%_120%_at_50%_-20%,color-mix(in_srgb,var(--color-violet-700)_38%,transparent),transparent_62%),linear-gradient(180deg,color-mix(in_srgb,var(--color-black)_62%,transparent),color-mix(in_srgb,var(--color-black)_82%,transparent))] backdrop-blur-[14px] md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <div aria-hidden className="pointer-events-none absolute inset-x-[14%] top-0 h-px bg-[linear-gradient(90deg,transparent,var(--color-violet-200),transparent)] shadow-[0_0_18px_2px_color-mix(in_srgb,var(--color-violet-400)_80%,transparent)]" />
          {gone !== null ? (
            <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-[color:color-mix(in_srgb,var(--color-white)_6%,transparent)]">
              <div style={{ width: `${gone * 100}%` }} className="relative h-full bg-[linear-gradient(90deg,transparent,var(--color-violet-500)_30%,var(--color-violet-300))]">
                <span className="absolute right-0 top-1/2 size-[6px] -translate-y-1/2 translate-x-1/2 rounded-full bg-[var(--color-white)] shadow-[0_0_12px_3px_color-mix(in_srgb,var(--color-violet-400)_90%,transparent)]" />
              </div>
            </div>
          ) : null}

          {/* The prize. */}
          <div className="flex flex-col items-center gap-2 px-6 pb-6 pt-7 md:px-8 md:py-7">
            <Ruled>Prize pool</Ruled>
            <p className="m-0 flex items-baseline gap-3 font-display font-bold tabular-nums tracking-tight [text-shadow:0_0_40px_color-mix(in_srgb,var(--color-violet-500)_45%,transparent)]">
              <span className="ix-hk-gleam text-5xl leading-5xl md:text-6xl md:leading-6xl">
                <CountUp value={prizePool} />
              </span>
              <span className="text-xl font-semibold leading-xl text-[color:var(--color-violet-200)] md:text-2xl md:leading-2xl">{HACKATHON.currency}</span>
            </p>
            <ul aria-label="Prizes by place" className="m-0 flex list-none flex-wrap items-center justify-center gap-x-5 gap-y-2 p-0 text-md leading-md text-[color:var(--color-text-secondary)] md:text-lg md:leading-lg">
              {HACKATHON.prizes.slice(0, 3).map((a, i) => (
                <li key={i} className="flex items-center gap-2 whitespace-nowrap">
                  <span className={cn("font-semibold", i === 0 ? "text-[color:var(--color-white)]" : "text-[color:var(--color-text-secondary)]")}>{PLACES[i]}</span>
                  <span className="tabular-nums">{a.toLocaleString("en-US")}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* The rule between, with its node. */}
          <div aria-hidden className="relative mx-10 h-px bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--color-violet-300)_45%,transparent),transparent)] md:mx-0 md:my-7 md:h-auto md:w-px md:bg-[linear-gradient(180deg,transparent,color-mix(in_srgb,var(--color-violet-300)_45%,transparent),transparent)]">
            <span className="absolute left-1/2 top-1/2 size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-violet-200)] shadow-[0_0_14px_3px_color-mix(in_srgb,var(--color-violet-400)_85%,transparent)]" />
          </div>

          {/* The clock. */}
          <div className="flex flex-col items-center justify-center gap-2 px-4 pb-7 pt-6 md:px-8 md:py-7">
            <Ruled>
              <span aria-hidden className={cn("size-[7px] rounded-full", phase === "live" ? "bg-[var(--color-green-400)] motion-safe:animate-pulse" : "bg-[var(--color-violet-300)]")} />
              {clock ? clock.label : " "}
            </Ruled>
            {counting ? (
              <div role="timer" aria-label={`${clock?.label ?? ""} ${t.d} days ${t.h} hours ${t.m} minutes`} className="flex items-start">
                {units.map(([v, l], i) => (
                  <React.Fragment key={l}>
                    {i ? (
                      <span aria-hidden className="px-1 font-display text-4xl font-light leading-4xl text-[color:color-mix(in_srgb,var(--color-violet-300)_55%,transparent)] md:px-2 md:text-5xl md:leading-5xl">
                        :
                      </span>
                    ) : null}
                    <span aria-hidden className="flex flex-col items-center gap-1">
                      <span className="font-display text-4xl font-semibold leading-4xl tabular-nums md:text-5xl md:leading-5xl">
                        <Digits v={v} />
                      </span>
                      <span className="text-md font-medium uppercase leading-md tracking-caps text-[color:var(--color-text-tertiary)]">{l}</span>
                    </span>
                  </React.Fragment>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function HackathonHero() {
  const { c, phase, unit } = useHackathon();
  const { HACKATHON, unitLabel, groupByLabel, stageName } = c;
  // The prototype's other facts, under the buttons: who, the format and the groups.
  const facts = [`${HACKATHON.minAge}+ · ${HACKATHON.where}`, unitLabel(unit), ...(groupByLabel ? [groupByLabel] : [])];
  const [lit, rest] = titleLines(HACKATHON.name);
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

      <div className="mx-auto flex w-full max-w-[1260px] flex-col items-center px-8 pt-[160px] text-center md:pt-[184px] lg:pt-[196px] min-[1292px]:px-0">
        <p className="ix-hk-fade flex items-center gap-3 rounded-full border border-solid border-[color:color-mix(in_srgb,var(--color-violet-300)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--color-black)_55%,transparent)] px-5 py-2 text-md font-medium leading-md text-[color:color-mix(in_srgb,var(--color-white)_86%,transparent)] backdrop-blur-[6px] md:text-lg md:leading-lg">
          <span aria-hidden className={cn("size-[8px] shrink-0 rounded-full", phase === "live" ? "bg-[var(--color-green-400)] motion-safe:animate-pulse" : "bg-[var(--color-violet-400)]")} />
          <span>
            {phase ? `${phase === "live" ? "Live now · " : ""}${stageName(phase)}` : " "}
          </span>
        </p>

        <h1 id="hackathon-title" className="mt-8 font-display text-6xl font-bold leading-6xl tracking-tighter text-[color:var(--color-white)] md:text-8xl md:leading-8xl">
          <span className="ix-hk-wipe block" style={{ animationDelay: "120ms" }}>
            <span className="bg-[linear-gradient(90deg,var(--color-violet-300),var(--color-violet-500))] bg-clip-text text-transparent [-webkit-background-clip:text]">{lit}</span>
          </span>
          {rest ? (
            <span className="ix-hk-wipe block" style={{ animationDelay: "260ms" }}>
              {rest}
            </span>
          ) : null}
        </h1>

        <p className="ix-hk-rise mt-6 max-w-[760px] text-xl leading-xl text-[color:var(--color-text-secondary)] [text-wrap:pretty] md:text-2xl md:leading-2xl" style={{ animationDelay: "420ms" }}>
          {HACKATHON.lead}
        </p>

        <PrizeAndClock />

        <div className="ix-hk-rise mt-8 flex w-full flex-col items-center justify-center gap-6 sm:w-auto sm:flex-row" style={{ animationDelay: "540ms" }}>
          <JoinButton className="w-full transition-shadow duration-fast hover:shadow-[0_0_36px_color-mix(in_srgb,var(--color-violet-500)_70%,transparent)] sm:w-auto" />
          <VoteLink className="w-full sm:w-auto" />
        </div>
        <ul className="ix-hk-rise m-0 mt-10 flex list-none flex-wrap justify-center gap-x-10 gap-y-4 p-0 md:mt-12 text-md leading-md text-[color:var(--color-text-secondary)] md:text-lg md:leading-lg" style={{ animationDelay: "620ms" }}>
          {facts.map((f) => (
            <li key={f} className="flex items-center gap-2">
              <HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={2.2} aria-hidden className="text-[color:var(--color-green-400)]" />
              {f}
            </li>
          ))}
        </ul>
        <p className="ix-hk-rise mt-6 text-md leading-md text-[color:var(--color-text-tertiary)] md:text-lg md:leading-lg" style={{ animationDelay: "660ms" }}>
          {HACKATHON.category} · {HACKATHON.langs}
        </p>
      </div>

      <div className="relative mx-auto mt-24 w-full max-w-[1236px] px-4 pb-24 md:mt-32 md:px-8 md:pb-32 xl:px-4">
        <HeroShowcase />
      </div>
    </section>
  );
}
