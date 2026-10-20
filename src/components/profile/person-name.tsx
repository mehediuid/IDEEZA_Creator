"use client";

// A person's name as a link to their profile (spec 2026-10-14-creator-profile-design.md):
// every name in the app opens the same page. A name that belongs to nobody
// yet (typed into a project team) stays plain text. The link keeps the text
// colour of the place it sits in and underlines on hover, so a feed card, a
// comment and a Messages header read as they did. Your own name links to your
// handle's address once you have one (Settings › Profile).

import * as React from "react";
import Link from "next/link";
import { profileHrefOf } from "@/lib/people/ids";
import { useMyProfile } from "@/lib/people/profile-store";
import { cn } from "@/lib/utils";

const TONE = {
  primary: "text-text-primary hover:text-text-primary",
  secondary: "text-text-secondary hover:text-text-primary",
} as const;

export function PersonName({
  id,
  from = "messages",
  tone = "primary",
  className,
  children,
  linkId,
}: {
  /** The person's id in the scheme the caller holds. */
  id: string;
  from?: "innovations" | "messages";
  tone?: keyof typeof TONE;
  className?: string;
  children: React.ReactNode;
  /** An id for the link itself (a comment labels its article by it). */
  linkId?: string;
}) {
  const { fields } = useMyProfile();
  const href = profileHrefOf(id, from, fields.handle);
  if (!href) {
    return (
      <span id={linkId} className={cn(TONE[tone], className)}>
        {children}
      </span>
    );
  }
  return (
    <Link
      id={linkId}
      href={href}
      className={cn(
        TONE[tone],
        "rounded-xs underline-offset-[3px] outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus",
        className,
      )}
    >
      {children}
    </Link>
  );
}
