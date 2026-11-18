"use client";

// Figma "Bottom action bar" (Account AU-05…18 and the Shared kit): what a
// screen's main action sits in, pinned under the content — bg/surface, a
// border/default line on top, 12 / 16 / 8 padding, 8 between its rows. Pass
// it as a Screen's `footer`; it rides on the keyboard with the screen.

import Link from "next/link";
import * as React from "react";
import { cn } from "@/lib/utils";
import { T } from "../type";

export function BottomBar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-t-[length:var(--border-width-1)] border-solid border-border bg-bg-surface px-8 pb-4 pt-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** A03 Link MD Brand with the kit's 44 px tap area (the bar's "Sign in", "Forgot password?"). */
export const TEXT_LINK = cn(
  T.rowTitle,
  "-my-6 inline-flex min-h-[44px] items-center text-text-brand outline-none hover:underline focus-visible:underline",
);

/** "New to IDEEZA? Create account" — the line under the bar's button. */
export function SwitchLine({ text, link, href }: { text: string; link: string; href: string }) {
  return (
    <p className={cn(T.body, "flex items-center justify-center gap-2")}>
      {text}
      <Link href={href} className={TEXT_LINK}>
        {link}
      </Link>
    </p>
  );
}
