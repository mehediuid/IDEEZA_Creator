"use client";

// What rises under the hero: the brief's violet-edged panel with a light line
// along its top, holding the hackathon's own visual (owner 2026-11-16: premium,
// futuristic, and not art the landing page already shows): a particle
// hologram (particle-hologram.tsx) where points of light become an idea, then
// its PCB, then the product, over and over. A HUD on the panel follows it —
// Idea → PCB → Product, the current step lit — and one line says what it
// means. If WebGL cannot start, the panel stays a lit violet stage with the
// same words.

import * as React from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "./context";
import { HERO_MEDIA } from "./parts";

const STEPS = ["Idea", "PCB", "Product"] as const;

const Hologram = dynamic(() => import("./particle-hologram").then((m) => m.ParticleHologram), { ssr: false, loading: () => null });

/** If the hologram cannot start (no WebGL), the stage simply stays without it. */
class SceneBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function HeroShowcase() {
  const still = useReducedMotion();
  const [step, setStep] = React.useState(0);
  const onStep = React.useCallback((i: number) => setStep(i), []);

  return (
    <div className="ix-hk-rise relative" style={{ animationDelay: "720ms" }}>
      {/* The light along the top edge: the brief's glow strip, screen-blended, over a thin violet line. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={HERO_MEDIA.strip} alt="" aria-hidden className="pointer-events-none absolute left-1/2 top-[-30px] z-[2] h-[60px] w-[78%] -translate-x-1/2 mix-blend-screen" />
      <div aria-hidden className="absolute inset-x-[10%] top-0 z-[2] h-px bg-[linear-gradient(90deg,transparent,var(--color-violet-300),transparent)] shadow-[0_0_16px_2px_color-mix(in_srgb,var(--color-violet-500)_70%,transparent)]" />

      <div
        role="img"
        aria-label="Points of light form a light bulb, then a circuit board, then a drone: an idea becoming hardware with IDEEZA AI."
        className="relative isolate h-[400px] overflow-hidden rounded-2xl border border-solid border-[color:color-mix(in_srgb,var(--color-violet-400)_32%,transparent)] bg-[radial-gradient(60%_70%_at_50%_50%,color-mix(in_srgb,var(--color-violet-900)_80%,transparent),var(--color-black)_75%)] shadow-[0_-30px_100px_-30px_color-mix(in_srgb,var(--color-violet-600)_55%,transparent)] md:h-[500px] lg:h-[560px]"
      >
        {/* A faint scan grid, the hologram's room. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(color-mix(in_srgb,var(--color-violet-300)_10%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_srgb,var(--color-violet-300)_10%,transparent)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(70%_70%_at_50%_50%,black,transparent)]" />
        <SceneBoundary>
          <Hologram still={still} onStep={onStep} />
        </SceneBoundary>

        {/* The HUD: where the light is in its journey. */}
        <ol aria-hidden className="pointer-events-none absolute left-5 top-5 m-0 flex list-none items-center gap-2 p-0 md:left-10 md:top-10 md:gap-3">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-2 md:gap-3">
              {i ? <span className={cn("h-px w-5 transition-colors duration-slow md:w-10", i <= step ? "bg-[var(--color-violet-300)]" : "bg-[color:color-mix(in_srgb,var(--color-white)_18%,transparent)]")} /> : null}
              <span
                className={cn(
                  "rounded-full border border-solid px-3 py-1 font-display text-sm font-semibold uppercase leading-sm tracking-caps transition-colors duration-slow md:px-4 md:text-md md:leading-md",
                  i === step
                    ? "border-[color:var(--color-violet-300)] bg-[color:color-mix(in_srgb,var(--color-violet-500)_30%,transparent)] text-[color:var(--color-white)] shadow-[0_0_24px_color-mix(in_srgb,var(--color-violet-500)_55%,transparent)]"
                    : "border-[color:color-mix(in_srgb,var(--color-white)_14%,transparent)] bg-[color:color-mix(in_srgb,var(--color-black)_45%,transparent)] text-[color:color-mix(in_srgb,var(--color-white)_60%,transparent)]",
                )}
              >
                {s}
              </span>
            </li>
          ))}
        </ol>

        {/* What it means. */}
        <p className="pointer-events-none absolute bottom-5 left-5 right-5 m-0 max-w-[460px] font-display text-lg font-semibold leading-lg text-[color:var(--color-white)] [text-wrap:balance] md:bottom-10 md:left-10 md:text-2xl md:leading-2xl">
          Say the idea in plain words. <span className="text-[color:var(--color-violet-300)]">IDEEZA AI builds the hardware.</span>
        </p>
      </div>
    </div>
  );
}
