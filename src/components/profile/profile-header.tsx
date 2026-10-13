"use client";

// A profile's header (spec 2026-10-14-creator-profile-design.md): no box, no
// cover. The avatar, the name in any script with the English-letters name
// under it, the headline, one facts line, and, on someone else's profile, how
// you are connected to them — only you see that line, since it is about you.
// The actions sit at the end: Follow · Message · ⋯ for someone else, Edit
// profile for you.

import * as React from "react";
import { Avatar, Badge } from "@/components/ideeza";

export function ProfileHeader({
  avatar,
  name,
  latinName,
  headline,
  emptyHeadline,
  facts,
  relation,
  demo,
  actions,
  titleRef,
}: {
  avatar: { initials: string; color: string | null; src: string | null };
  name: string;
  latinName: string | null;
  headline: string | null;
  /** Your own profile with no headline: what to show in its place (a link to Edit profile). */
  emptyHeadline?: React.ReactNode;
  facts: string | null;
  relation: string | null;
  /** A demo person (everyone but you, until there are accounts). */
  demo: boolean;
  actions: React.ReactNode;
  titleRef?: React.Ref<HTMLHeadingElement>;
}) {
  return (
    <header className="flex flex-wrap items-start gap-x-[24px] gap-y-[16px]">
      <div className="flex min-w-0 flex-[1_1_420px] items-start gap-[16px] md:gap-[20px]">
        <Avatar
          size="xl"
          initials={avatar.initials}
          color={avatar.color ?? undefined}
          src={avatar.src ?? undefined}
          className="max-md:size-[48px] max-md:text-xl max-md:leading-xl"
        />
        <div className="flex min-w-0 flex-col gap-[2px]">
          <div className="flex min-w-0 flex-wrap items-center gap-x-[8px] gap-y-[4px]">
            <h1
              ref={titleRef}
              tabIndex={-1}
              className="min-w-0 break-words text-3xl font-bold leading-3xl tracking-tight text-text-primary outline-none"
            >
              {name}
            </h1>
            {demo && <Badge tone="neutral">Demo creator</Badge>}
          </div>
          {latinName && <p className="text-sm leading-sm text-text-tertiary">{latinName}</p>}
          {headline ? (
            <p className="mt-[6px] max-w-[62ch] text-lg leading-lg text-text-primary">{headline}</p>
          ) : (
            emptyHeadline && <div className="mt-[6px]">{emptyHeadline}</div>
          )}
          {facts && <p className="text-md leading-md text-text-secondary">{facts}</p>}
          {relation && (
            <p className="mt-[4px] flex items-center gap-[6px] text-md font-medium leading-md text-text-primary">
              <span aria-hidden className="size-[6px] shrink-0 rounded-full bg-bg-brand" />
              {relation}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-[8px] max-md:hidden">{actions}</div>
    </header>
  );
}
