"use client";

// Your own profile's one owner-only line (spec 2026-10-14-creator-profile-design.md):
// how much of your work others can see, and where the rest is. Nothing else on
// the page differs between your view and everyone else's, so there is no
// "view as others" mode.

import * as React from "react";
import Link from "next/link";
import { ViewIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";

const LINK =
  "text-md font-semibold leading-md text-text-link underline-offset-[3px] outline-none hover:underline focus-visible:rounded-xs focus-visible:ring-2 focus-visible:ring-border-focus";

export function OwnerLine({ shown, hidden, extra }: { shown: number; hidden: number; extra?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-[16px] gap-y-[6px] rounded-lg bg-bg-surface-raised px-[16px] py-[10px]">
      <span className="inline-flex items-center gap-[6px] text-sm font-semibold leading-sm text-text-primary">
        <Icon icon={ViewIcon} size={16} />
        Only you see this
      </span>
      <span className="text-md leading-md text-text-secondary">
        {shown > 0
          ? `Others see ${shown} ${shown === 1 ? "project" : "projects"}.`
          : "Others see your name and nothing else yet."}
      </span>
      {hidden > 0 && (
        <Link href="/projects" className={LINK}>
          {`${hidden} private in My projects`}
        </Link>
      )}
      {extra}
    </div>
  );
}

export const OWNER_LINE_LINK = LINK;
