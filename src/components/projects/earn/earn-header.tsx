"use client";

// The Earn area's header, in reading order:
// 1. "← {project}", back to the engineering page;
// 2. the h1 "Earn" and the project's commercial status chip, then Preview as
//    buyer (quiet), which moved here from the project header;
// 3. the status line (in the owner's Sold line the buyer is a link to their
//    Customers row, a `sale=` deep link), then the lock line once the
//    project is sold in full, which is why every section below reads-only.
// Every string is `headerText()`'s (project-summary.ts), the same object the
// project header reads, so the two can't disagree (COR-11). The h1 takes the
// layout's arrival focus (`titleRef`, COR-7). Nothing here prints: Print or
// save as PDF on the business plan prints the plan alone.
//
// Preview as buyer is a preview of the project page — the Earn area has no
// audience view — so it opens `/projects/<id>?view=buyer`, and Exit preview
// there leaves the maker on the project page (Back returns here).

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft02Icon, EyeIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { LeaveButton } from "@/components/create/leave-button";
import { StatusChip } from "@/components/projects/status-chip";
import { LockLine } from "@/components/projects/product/product-states";
import { withView } from "@/lib/manual/buyer-preview";
import { earnHref } from "@/lib/manual/earn-route";
import { can, hasAudience } from "@/lib/manual/permissions";
import { headerText } from "@/lib/manual/project-summary";
import type { SlotProps } from "../details/slots";

/** Full width and 44 px at phone width; its own width from a 520 px header (the project header's rule). */
const HEADER_BUTTON = "h-[44px] w-full justify-center [@container(min-width:520px)]:w-auto";

const BACK =
  "inline-flex min-h-[24px] max-w-full items-center gap-2 self-start rounded-sm text-sm font-medium text-text-secondary outline-none transition-colors duration-normal ease-out hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

/** The buyer's link inside the Sold line: on a phone its padding makes a 44 px target
 *  without moving the line (an inline box's vertical padding takes no space). */
const INLINE_LINK =
  "rounded-sm font-medium text-text-link underline-offset-2 outline-none transition-colors duration-normal ease-decelerate hover:text-text-link-hover hover:underline focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none max-md:py-[13px] [@media(pointer:coarse)]:py-[13px]";

export function EarnHeader({
  project,
  view,
  viewer,
  titleRef,
}: SlotProps & { titleRef: React.RefObject<HTMLHeadingElement | null> }) {
  const router = useRouter();
  const [leaving, setLeaving] = React.useState(false);
  const { summary } = view;
  const text = headerText(summary, { viewer, stage: view.stage });
  const preview = can(viewer, "preview.enter") && hasAudience(summary.status, summary.showcase);
  // The project header links the buyer to `?tab=customers&sale=`; here it is the same sale on Earn › Customers.
  const sold = text.soldBuyerLink;
  const saleId = sold ? (summary.sold?.owner.buyer?.saleId ?? null) : null;

  return (
    <header className="flex flex-col gap-6 print:hidden [container-type:inline-size]">
      <Link href={`/projects/${project.id}`} className={BACK}>
        <Icon icon={ArrowLeft02Icon} size={16} />
        <span className="min-w-0 truncate">{project.name}</span>
      </Link>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-6 [@container(min-width:520px)]:flex-row [@container(min-width:520px)]:items-center [@container(min-width:520px)]:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-3">
            <h1 ref={titleRef} tabIndex={-1} className="m-0 text-3xl font-bold tracking-tight text-text-primary outline-none">
              Earn
            </h1>
            <StatusChip status={summary.status} word={text.chip.word} />
          </div>
          {preview && (
            <LeaveButton
              tone="quiet"
              busy={leaving}
              blocked={leaving}
              onClick={() => {
                setLeaving(true);
                router.push(`/projects/${project.id}?${withView("", "buyer")}`);
              }}
              icon={EyeIcon}
              className={HEADER_BUTTON}
            >
              Preview as buyer
            </LeaveButton>
          )}
        </div>

        <p className="m-0 min-w-0 text-md text-text-secondary">
          {sold && saleId ? (
            <>
              {sold.before}
              <Link href={earnHref(project.id, "customers", { sale: saleId })} className={INLINE_LINK}>
                {sold.label}
              </Link>
              {sold.after}
            </>
          ) : (
            text.chip.line
          )}
        </p>
        {text.lockLine && <LockLine line={text.lockLine} />}
      </div>
    </header>
  );
}
