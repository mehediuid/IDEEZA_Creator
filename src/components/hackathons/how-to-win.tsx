"use client";

// How it works: the route from sign-up to winning, as the prototype's landing
// page writes it (owner 2026-11-17: that page's content is final) — the title
// and lead with the two actions on the left, staying in view, and the numbered
// steps on the right. The steps follow the campaign (its groups, the team
// style, its AI mode and how the winner is decided).

import * as React from "react";
import { cn } from "@/lib/utils";
import { useHackathon } from "./context";
import { JoinButton, VoteLink } from "./actions";
import { SECTION } from "./parts";

export function HowToWin() {
  const { c, unit } = useHackathon();
  const STEPS = c.steps(unit);
  return (
    <section id="how" aria-labelledby="how-title" className={SECTION}>
      <div className="grid grid-cols-1 gap-24 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-32">
        <div className="flex flex-col gap-12 self-start lg:sticky lg:top-[184px]">
          <div className="flex flex-col gap-8 md:gap-10">
            <h2 id="how-title" className="font-display text-5xl font-semibold leading-5xl tracking-snug text-[color:var(--color-text-primary)] [text-wrap:balance] md:text-6xl md:leading-6xl">
              From idea to the competition in {STEPS.length} steps
            </h2>
            <p className="text-xl leading-xl text-[color:var(--color-text-secondary)] [text-wrap:pretty] md:text-2xl md:leading-2xl">
              No engineering background needed. Describe your idea in plain language and IDEEZA AI generates the full hardware design.
            </p>
          </div>
          <div className="flex flex-col gap-6 sm:flex-row">
            <JoinButton size="xl" />
            <VoteLink size="xl" />
          </div>
        </div>

        <ol className="m-0 flex list-none flex-col p-0">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="relative flex gap-8 pb-16 last:pb-0 md:gap-10">
              {/* The track joining the steps. */}
              {i < STEPS.length - 1 ? <span aria-hidden className="absolute bottom-0 left-[23px] top-[52px] w-px bg-[color:color-mix(in_srgb,var(--color-white)_14%,transparent)]" /> : null}
              <span
                aria-hidden
                className={cn(
                  "relative flex size-[48px] shrink-0 items-center justify-center rounded-full font-display text-xl font-semibold tabular-nums",
                  i === STEPS.length - 1 ? "bg-[var(--color-button-primary-bg)] text-[color:var(--color-white)]" : "border border-solid border-[color:color-mix(in_srgb,var(--color-violet-300)_45%,transparent)] text-[color:var(--color-violet-200)]",
                )}
              >
                {i + 1}
              </span>
              <div className="flex flex-col gap-4 pt-[10px]">
                <h3 className="text-2xl font-semibold leading-2xl text-[color:var(--color-text-primary)]">{t}</h3>
                <p className="max-w-[600px] text-xl leading-xl text-[color:var(--color-text-secondary)]">{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
