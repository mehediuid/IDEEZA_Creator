"use client";

// The Earn area's header, in reading order (owner, 2026-10-11):
// 1. "← {project}", back to the engineering page;
// 2. the h1 "Earn" and one status pill in a maker's words (`earnStatusOf`,
//    from the commercial axis): Not for sale yet, Minted, On the marketplace,
//    Listing paused, Part sold, Sold out, Given away. No status sub-line;
//    the Overview says what the state means and what comes next;
// 3. once the project is minted, Preview as buyer, a quiet ghost link;
// 4. the lock line once the project is sold in full, which is why every tab
//    below reads-only.
// The h1 takes the layout's arrival focus (`titleRef`, COR-7). Nothing here
// prints: Print or save as PDF on the business plan prints the plan alone.
//
// Preview as buyer is a preview of the project page — the Earn area has no
// audience view — so it opens `/projects/<id>?view=buyer`, and Exit preview
// there leaves the maker on the project page (Back returns here).

import * as React from "react";
import Link from "next/link";
import { ArrowLeft02Icon, EyeIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, buttonVariants } from "@/components/ideeza";
import { LockLine } from "@/components/projects/product/product-states";
import type { CommercialState } from "@/lib/commerce/state";
import { withView } from "@/lib/manual/buyer-preview";
import { earnStatusOf } from "@/lib/manual/earn-view";
import { can, hasAudience } from "@/lib/manual/permissions";
import { headerText } from "@/lib/manual/project-summary";
import { cn } from "@/lib/utils";
import { labelOf } from "@/lib/manual/journey";
import type { SlotProps } from "../details/slots";
import { TAP } from "./surface";

const BACK =
  "inline-flex min-h-[24px] max-w-full items-center gap-2 self-start rounded-sm text-md font-medium text-text-secondary outline-none transition-colors duration-normal ease-out hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

export function EarnHeader({
  project,
  view,
  viewer,
  commercial,
  titleRef,
}: SlotProps & { commercial: CommercialState; titleRef: React.RefObject<HTMLHeadingElement | null> }) {
  const { summary } = view;
  const text = headerText(summary, { viewer, now: { label: labelOf(view.current) } });
  const status = earnStatusOf(commercial);
  const preview = commercial !== "none" && can(viewer, "preview.enter") && hasAudience(summary.status, summary.showcase);

  return (
    <header className="flex flex-col gap-6 print:hidden">
      <Link href={`/projects/${project.id}`} className={BACK}>
        <Icon icon={ArrowLeft02Icon} size={16} />
        <span className="min-w-0 truncate">{project.name}</span>
      </Link>

      {/* As tall as Preview as buyer, so the tabs sit at one height whether it shows or not. */}
      <div className="flex min-h-[40px] flex-wrap items-center justify-between gap-x-8 gap-y-4">
        <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-3">
          <h1 ref={titleRef} tabIndex={-1} className="m-0 text-3xl font-bold leading-3xl tracking-tight text-text-primary outline-none">
            Earn
          </h1>
          <Badge tone={status.tone} className="h-[24px] px-[10px] py-0 text-sm font-semibold leading-sm">
            {status.word}
          </Badge>
        </div>
        {preview && (
          <Link
            href={`/projects/${project.id}?${withView("", "buyer")}`}
            // The reset colours every a:hover as a link; the button keeps its own text colour.
            className={cn(
              buttonVariants({ hierarchy: "ghost", size: "md" }),
              "gap-3 hover:text-[color:var(--color-button-ghost-text)]",
              TAP,
            )}
          >
            <Icon icon={EyeIcon} size={16} />
            Preview as buyer
          </Link>
        )}
      </div>

      {text.lockLine && <LockLine line={text.lockLine} />}
    </header>
  );
}
