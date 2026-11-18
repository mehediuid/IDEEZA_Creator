"use client";

// The prototype's style switch (owner 2026-11-17: "this is a prototype, it has
// to show everything — a place to switch between 1 vs 1 and single and see
// each"). The organizer picks the style in the hackathon's setup; here the
// person reviewing the page flips it to see what each style shows: the board
// for Individuals, the head-to-head matches for 1 vs 1. It floats at the
// bottom corner so the page's own layout does not move, and it says that it is
// a prototype control. The look is the page's own two-way pill (the board's
// Everyone / Open category).

import * as React from "react";
import { cn } from "@/lib/utils";
import type { Unit } from "@/lib/hackathons/vibe-inventing";
import { useHackathon } from "./context";

const STYLES: [Unit, string][] = [
  ["solo", "Individuals"],
  ["duel", "1 vs 1"],
];

export function StyleSwitch() {
  const { c, unit, setUnit } = useHackathon();
  return (
    <div
      role="group"
      aria-label="Prototype: hackathon style"
      className="fixed bottom-6 left-6 z-[10] flex items-center gap-4 rounded-full border border-solid border-[color:color-mix(in_srgb,var(--color-white)_14%,transparent)] bg-[color:color-mix(in_srgb,var(--color-bg-page)_88%,transparent)] py-2 pl-6 pr-2 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-[24px] md:bottom-8 md:left-8"
    >
      <span className="text-md font-medium leading-md text-[color:var(--color-text-tertiary)]">{c.HACKATHON.sample ? "Prototype · sample hackathon" : "Prototype"}</span>
      <div className="flex rounded-full bg-[color:color-mix(in_srgb,var(--color-white)_6%,transparent)] p-1">
        {STYLES.map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={unit === value}
            onClick={() => setUnit(value)}
            className={cn(
              "h-[40px] whitespace-nowrap rounded-full border-0 px-5 text-md font-medium leading-md transition-colors duration-fast",
              unit === value ? "bg-[color:color-mix(in_srgb,var(--color-white)_14%,transparent)] text-[color:var(--color-text-primary)]" : "bg-transparent text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]",
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
