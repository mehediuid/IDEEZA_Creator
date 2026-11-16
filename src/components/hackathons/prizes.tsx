"use client";

// The prizes as a podium: second, first, third, with each step as tall as its
// prize is big, so the gap between places is seen before it is read. First
// place carries the brand colour; the extras (giveaways, the AI unlock) sit
// under it as what everyone can win along the way.

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { GiftIcon, SparklesIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { HACKATHON, money, prizePool } from "@/lib/hackathons/vibe-inventing";
import { Heading, SECTION, SURFACE } from "./parts";

const PLACE = ["1st place", "2nd place", "3rd place"];
// Visual order on the podium: 2nd · 1st · 3rd (the list itself stays 1st → 3rd for screen readers).
const ORDER = ["order-2", "order-1", "order-3"];

export function Prizes() {
  const top = HACKATHON.prizes[0];
  return (
    <section id="prizes" aria-labelledby="prizes-title" className={SECTION}>
      <Heading id="prizes-title" title={`${money(prizePool)} for the top three`} lead={`The board's top ${HACKATHON.shortlist} go to the judges, and the judges pick the three winners.`} />

      <ol className="m-0 mx-auto mt-20 grid max-w-[960px] list-none grid-cols-3 items-end gap-4 p-0 md:gap-8">
        {HACKATHON.prizes.map((amount, i) => {
          const first = i === 0;
          return (
            <li key={i} className={cn("flex flex-col", ORDER.at(i))}>
              <div className="flex flex-col items-center gap-2 pb-8 text-center">
                <span className="text-sm font-medium leading-sm text-[color:var(--color-text-secondary)] md:text-md md:leading-md">{PLACE.at(i)}</span>
                <span className={cn("font-display font-bold tabular-nums text-[color:var(--color-text-primary)]", first ? "text-4xl leading-4xl md:text-7xl md:leading-7xl" : "text-3xl leading-3xl md:text-5xl md:leading-5xl")}>
                  {amount.toLocaleString("en-US")}
                </span>
                <span className="text-sm leading-sm text-[color:var(--color-text-tertiary)] md:text-lg md:leading-lg">{HACKATHON.currency}</span>
              </div>
              {/* The step: its height follows the prize. */}
              <div
                aria-hidden
                style={{ height: `${Math.round(90 + (amount / top) * 200)}px` }}
                className={cn(
                  "relative flex items-start justify-center overflow-hidden rounded-t-3xl pt-8",
                  first
                    ? "bg-[linear-gradient(to_bottom,var(--color-violet-500),var(--color-violet-800))] shadow-[0_-24px_80px_color-mix(in_srgb,var(--color-violet-600)_40%,transparent)]"
                    : "bg-[linear-gradient(to_bottom,color-mix(in_srgb,var(--color-white)_12%,transparent),color-mix(in_srgb,var(--color-white)_3%,transparent))]",
                )}
              >
                <span className={cn("font-display text-7xl font-bold leading-7xl md:text-8xl md:leading-8xl", first ? "text-[color:color-mix(in_srgb,var(--color-white)_92%,transparent)]" : "text-[color:color-mix(in_srgb,var(--color-white)_40%,transparent)]")}>{i + 1}</span>
              </div>
            </li>
          );
        })}
      </ol>

      <ul className="m-0 mx-auto mt-12 grid max-w-[960px] list-none grid-cols-1 gap-4 p-0 md:grid-cols-2 md:gap-8">
        {[
          { icon: GiftIcon, title: "Giveaways every 2 days", text: "Bonus AI credits and IDEEZA merch, given out every 2 days while the hackathon runs." },
          { icon: SparklesIcon, title: "Better AI for the top 50", text: "In the last 3 days the top 50 build on Medium quality instead of Low." },
        ].map((x) => (
          <li key={x.title} className={cn("flex items-start gap-6 rounded-2xl px-8 py-8", SURFACE)}>
            <span className="flex size-[44px] shrink-0 items-center justify-center rounded-xl bg-[color:color-mix(in_srgb,var(--color-violet-600)_22%,transparent)] text-[color:var(--color-violet-200)]">
              <HugeiconsIcon icon={x.icon} size={22} strokeWidth={1.8} />
            </span>
            <span className="flex flex-col gap-2">
              <span className="text-lg font-semibold leading-lg text-[color:var(--color-text-primary)]">{x.title}</span>
              <span className="text-md leading-md text-[color:var(--color-text-secondary)]">{x.text}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
