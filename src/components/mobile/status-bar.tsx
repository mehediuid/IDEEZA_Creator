"use client";

// Figma "Mobile / Status bar" (Shared kit 10600:4): 53 tall, the time on the
// left (Label/LG, text/primary), cellular · wifi · battery on the right
// (bg/inverse). Only drawn in the desktop's phone frame — on a phone the OS
// draws its own, and the screen keeps clear of it with the safe-area inset.
// The positions are the device's (time at 25,17; icons end 36 from the edge).

import * as React from "react";
import { cn } from "@/lib/utils";
import { useFramed } from "./device";
import { T } from "./type";

function clock(): string {
  const d = new Date();
  return `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function useClock(): string {
  const [now, setNow] = React.useState(clock);
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(clock()), 15_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

/** Text over a photo or video is always white (owner rule): `media` is the
 *  Semantic=Dark look the Feed clips use. */
export type StatusTone = "default" | "media";

export function StatusBar({ tone = "default", className }: { tone?: StatusTone; className?: string }) {
  const framed = useFramed();
  if (!framed) return <div aria-hidden className={cn("h-[env(safe-area-inset-top)] shrink-0", className)} />;
  return <FramedStatusBar tone={tone} className={className} />;
}

function FramedStatusBar({ tone, className }: { tone: StatusTone; className?: string }) {
  const time = useClock();
  return (
    <div
      aria-hidden
      data-theme={tone === "media" ? "dark" : undefined}
      className={cn(
        "flex h-[53px] shrink-0 items-start justify-between pl-[25px] pr-[36px] pt-[17px]",
        className,
      )}
    >
      <span className={cn(T.name, "tabular-nums")}>{time}</span>
      <svg width="67" height="12" viewBox="0 0 67 12" className="mt-[5px] text-[color:var(--color-bg-inverse)]">
        <rect opacity="0.35" x="42.83" y="0.5" width="21" height="10.33" rx="2.17" fill="none" stroke="currentColor" />
        <path opacity="0.4" d="M65.33 3.67v4c.8-.34 1.33-1.13 1.33-2s-.53-1.66-1.33-2Z" fill="currentColor" />
        <rect x="44.33" y="2" width="18" height="7.33" rx="1.33" fill="currentColor" />
        <path
          d="M27.46 8.4a3.3 3.3 0 0 1 4.42 0c.13.12.14.33.01.46l-2 2.02a.31.31 0 0 1-.44 0l-2-2.02a.32.32 0 0 1 .01-.46Zm-2.67-2.69a7 7 0 0 1 9.75 0c.13.12.13.33.01.46l-1.16 1.17a.32.32 0 0 1-.43.01 5.02 5.02 0 0 0-6.59 0 .32.32 0 0 1-.43-.01l-1.16-1.17a.32.32 0 0 1 0-.46Zm-2.66-2.68a10.7 10.7 0 0 1 15.08 0c.13.12.13.33 0 .46l-1.15 1.17a.32.32 0 0 1-.44 0 8.4 8.4 0 0 0-11.9 0 .32.32 0 0 1-.44 0l-1.16-1.17a.32.32 0 0 1 .01-.46Z"
          fill="currentColor"
        />
        <path
          d="M11.33 2.67a1 1 0 0 1 1 1V10a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1V3.67a1 1 0 0 1 1-1h1ZM16 .34a1 1 0 0 1 1 1V10a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1V1.34a1 1 0 0 1 1-1h1ZM2 7a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h1Zm4.67-2a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h1Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}
