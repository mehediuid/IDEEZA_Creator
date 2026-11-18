// The landing page's section heading: the eyebrow chip, the Display/MD title
// and the Heading/H4 lead under it, centred. Figma IDEEZA Website V-2,
// 18532:51827 (For Everyone); every section's "Frame 2147224457" repeats it.

import * as React from "react";
import { cn } from "@/lib/utils";

/** The eyebrow chip over a section title — Figma 18532:51828. */
export function LandingEyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex rounded-[40px] bg-[var(--color-bg-surface)] p-2", className)}>
      <span className="flex h-[32px] items-center justify-center whitespace-nowrap rounded-[40px] border-solid border border-[var(--color-border-default)] bg-[var(--color-bg-page)] px-7 py-3 font-display text-md font-medium leading-md tracking-normal text-[color:var(--color-text-primary)]">
        {children}
      </span>
    </div>
  );
}

export function LandingSectionHeader({
  eyebrow,
  title,
  lead,
  className,
  id,
}: {
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  lead?: React.ReactNode;
  className?: string;
  /** The heading's id, for the section's aria-labelledby. */
  id?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-[28px] text-center", className)}>
      <LandingEyebrow>{eyebrow}</LandingEyebrow>
      <div className="flex w-full flex-col items-center gap-[28px] font-display font-semibold">
        <h2
          id={id}
          className="w-full text-6xl leading-6xl tracking-snug text-[color:var(--color-text-primary)]"
        >
          {title}
        </h2>
        {lead ? (
          <p className="w-full text-2xl leading-2xl tracking-normal text-[color:var(--color-text-secondary)]">
            {lead}
          </p>
        ) : null}
      </div>
    </div>
  );
}
