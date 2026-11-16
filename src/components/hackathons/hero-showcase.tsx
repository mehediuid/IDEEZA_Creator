"use client";

// What rises under the hero: the brief's violet-edged panel with a light line
// along its top, holding a futuristic invention stage (owner 2026-11-16:
// "premium, futuristic, attractive — something that makes people want to
// build with this", not an app, not the page's product photos again). The
// pieces are IDEEZA's own premium renders from the website's Figma (Website
// V-2 hero: the holographic drone, the lit violet chip, the glass chip, the
// dotted globe), all on black, so they screen-blend into the stage: the drone
// hovers in the middle, the two chips float either side of it, the globe's
// horizon glows underneath (echoing the planet rim above), and thin HUD tags
// name what one idea becomes — concept, PCB, code, 3D. The pieces drift
// with the pointer on wide screens (depth) and float slowly by themselves;
// with reduced motion everything holds still.

import * as React from "react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "./context";
import { HERO_MEDIA } from "./parts";

const ART = "/landing/hero/";

/**
 * One piece of the stage, in three layers so their transforms never fight:
 * the outer box places it (its own translate classes), the middle drifts
 * against the pointer by `depth` px, the inner floats by itself.
 */
function Piece({ depth, className, float, children }: { depth: number; className: string; float?: { dur: number; delay: number; tilt?: number }; children: React.ReactNode }) {
  return (
    // The blend sits on the outermost layer: inside the float/drift layers (each its own stacking
    // context) the renders' black would blend with nothing and show as a dark box.
    <div aria-hidden className={cn("pointer-events-none absolute mix-blend-screen", className)}>
      <div style={{ transform: `translate3d(calc(var(--px, 0) * ${depth}px), calc(var(--py, 0) * ${depth * 0.6}px), 0)`, transition: "transform 600ms cubic-bezier(0.22, 1, 0.36, 1)" }}>
        <div className={float ? "ix-hk-float" : undefined} style={float ? ({ animationDuration: `${float.dur}s`, animationDelay: `${float.delay}s`, "--tilt": `${float.tilt ?? 0}deg` } as React.CSSProperties) : undefined}>
          {children}
        </div>
      </div>
    </div>
  );
}

/** A HUD tag: a lit dot, a hairline leader, a glass label. */
function Tag({ children, className, side = "right" }: { children: React.ReactNode; className: string; side?: "left" | "right" }) {
  return (
    <div className={cn("absolute flex items-center gap-2", side === "left" && "flex-row-reverse", className)}>
      <span className="relative flex size-[10px] items-center justify-center">
        <span className="absolute size-[10px] rounded-full bg-[var(--color-violet-300)] opacity-60 motion-safe:animate-ping" />
        <span className="size-[6px] rounded-full bg-[var(--color-violet-200)]" />
      </span>
      <span className="h-px w-[28px] bg-[linear-gradient(90deg,var(--color-violet-300),transparent)] md:w-[48px]" style={side === "left" ? { transform: "scaleX(-1)" } : undefined} />
      <span className="whitespace-nowrap rounded-full border border-solid border-[color:color-mix(in_srgb,var(--color-violet-300)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--color-black)_55%,transparent)] px-3 py-1 font-display text-xs font-semibold uppercase leading-xs tracking-caps text-[color:var(--color-violet-100)] backdrop-blur-[6px] md:px-4 md:text-sm md:leading-sm">
        {children}
      </span>
    </div>
  );
}

export function HeroShowcase() {
  const still = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (still || e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    ref.current.style.setProperty("--px", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
    ref.current.style.setProperty("--py", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
  };
  const onLeave = () => {
    ref.current?.style.setProperty("--px", "0");
    ref.current?.style.setProperty("--py", "0");
  };
  const f = (dur: number, delay: number, tilt?: number) => (still ? undefined : { dur, delay, tilt });

  return (
    <div className="ix-hk-rise relative" style={{ animationDelay: "720ms" }}>
      {/* The light along the top edge: the brief's glow strip, screen-blended, over a thin violet line. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={HERO_MEDIA.strip} alt="" aria-hidden className="pointer-events-none absolute left-1/2 top-[-30px] z-[2] h-[60px] w-[78%] -translate-x-1/2 mix-blend-screen" />
      <div aria-hidden className="absolute inset-x-[10%] top-0 z-[2] h-px bg-[linear-gradient(90deg,transparent,var(--color-violet-300),transparent)] shadow-[0_0_16px_2px_color-mix(in_srgb,var(--color-violet-500)_70%,transparent)]" />

      <div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        role="img"
        aria-label="A holographic drone hovering between two glowing chips over a dotted globe: one idea becomes the concept, the PCB, the code and the 3D model."
        className="relative isolate h-[380px] overflow-hidden rounded-2xl border border-solid border-[color:color-mix(in_srgb,var(--color-violet-400)_32%,transparent)] bg-[radial-gradient(70%_80%_at_50%_100%,color-mix(in_srgb,var(--color-violet-800)_70%,transparent),var(--color-black)_70%)] shadow-[0_-30px_100px_-30px_color-mix(in_srgb,var(--color-violet-600)_55%,transparent)] md:h-[500px] lg:h-[560px]"
      >
        {/* The globe's horizon, glowing under everything. */}
        <Piece depth={6} className="bottom-[-46%] left-1/2 w-[190%] -translate-x-1/2 md:bottom-[-58%] md:w-[150%]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${ART}globe-art.png`} alt="" className="block w-full" />
        </Piece>
        {/* Light behind the drone. */}
        <div aria-hidden className="absolute left-1/2 top-[48%] size-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-violet-500)_45%,transparent),transparent)] md:size-[620px]" />
        {/* The pad under the drone: two light rings in perspective. */}
        <div aria-hidden className="absolute left-1/2 top-[74%] h-[60px] w-[62%] -translate-x-1/2 rounded-[50%] border border-solid border-[color:color-mix(in_srgb,var(--color-violet-300)_45%,transparent)] shadow-[0_0_40px_color-mix(in_srgb,var(--color-violet-500)_45%,transparent)] md:h-[90px] md:w-[46%]" />
        <div aria-hidden className="absolute left-1/2 top-[76%] h-[34px] w-[40%] -translate-x-1/2 rounded-[50%] border border-solid border-[color:color-mix(in_srgb,var(--color-blue-300)_35%,transparent)] md:h-[54px] md:w-[30%]" />

        {/* The violet chip, left. */}
        <Piece depth={-22} className="left-[-4%] top-[14%] w-[34%] md:left-[6%] md:top-[16%] md:w-[22%] lg:w-[20%]" float={f(7, 0.4, -10)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${ART}chip-left.png`} alt="" className="block w-full" />
        </Piece>
        {/* The glass chip, right. */}
        <Piece depth={-30} className="right-[-2%] top-[22%] w-[26%] md:right-[9%] md:top-[18%] md:w-[15%] lg:w-[14%]" float={f(8, 1.2, 12)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${ART}chip-right.png`} alt="" className="block w-full" />
        </Piece>
        {/* The drone, hovering in the middle. */}
        <Piece depth={14} className="left-1/2 top-[50%] w-[78%] -translate-x-1/2 -translate-y-1/2 md:w-[48%] lg:w-[42%]" float={f(5.5, 0)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${ART}drone.png`} alt="" className="block w-full drop-shadow-[0_30px_60px_color-mix(in_srgb,var(--color-violet-600)_55%,transparent)]" />
        </Piece>

        {/* What one idea becomes. */}
        <Tag className="left-[24%] top-[12%] hidden md:flex">PCB</Tag>
        <Tag side="left" className="right-[24%] top-[14%] hidden md:flex">Code</Tag>
        <Tag className="left-[8%] top-[64%] md:left-[20%] md:top-[66%]">Concept</Tag>
        <Tag side="left" className="right-[8%] top-[60%] md:right-[22%] md:top-[64%]">3D model</Tag>

        {/* The edges fade into the panel, the stars of the page show through the top. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_45%,transparent_60%,color-mix(in_srgb,var(--color-black)_70%,transparent))]" />
      </div>
    </div>
  );
}
