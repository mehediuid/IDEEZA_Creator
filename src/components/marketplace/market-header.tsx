"use client";

// The buyer view's header (Phase 2 spec §2.4; P2-MARKETPLACE-8, -9 as
// changed). It is the project page's own ProjectHeader in its "market"
// context, so the two can't drift: the h1 with no pencil, the status chip
// ("Listed" for any live listing, the line naming Auction), the Showcase
// badge, "Created by you · Listed Sep 28, 2026", and the read-only
// description. `can()` refuses the demo buyer every owner control, so the
// pair, the pencil and Preview as buyer are absent, not disabled (PPL-6).
//
// Every creator here is the person at the keyboard, so it adds one quiet
// link back to the owner's page: "Your project page".

import Link from "next/link";
import { ArrowRight02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { ProjectHeader } from "@/components/projects/details/header";
import type { HeaderSlotProps } from "@/components/projects/details/slots";

const QUIET_LINK =
  "inline-flex min-h-[24px] items-center gap-2 self-start rounded-sm text-sm font-medium text-text-brand outline-none hover:text-text-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus [@media(pointer:coarse)]:min-h-[var(--touch-min)] max-md:min-h-[var(--touch-min)]";

export function MarketHeader(props: HeaderSlotProps) {
  return (
    <div className="flex flex-col gap-6">
      <ProjectHeader {...props} context="market" />
      <Link href={`/projects/${props.project.id}`} className={QUIET_LINK}>
        Your project page
        <Icon icon={ArrowRight02Icon} size={14} />
      </Link>
    </div>
  );
}
