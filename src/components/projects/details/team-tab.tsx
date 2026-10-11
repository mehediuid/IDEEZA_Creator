"use client";

// The Team tab (Build and Earn P0): who is on the project, by name and role,
// from `teamOf` — the credit a buyer has always read, now the same for every
// viewer. The roster with its ownership %, the add/edit dialog and removal
// (contributors-tab.tsx) moved to Earn › Splits, so the owner gets a quiet
// link there; a locked project (sold in full) refuses the link as it refuses
// every people write (`can(…, view.canCtx)`).
//
// The tab shows for the owner and a contributor preview always, for a buyer
// only with ≥ 1 contributor (`projectTabsFor`). An owner with nobody on the
// project reads an empty state that says where people are added.

import Link from "next/link";
import { ArrowRight02Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { StateCard, buttonVariants } from "@/components/ideeza";
import { initialsOf, teamOf } from "@/lib/manual/contributors";
import { earnHref } from "@/lib/manual/earn-route";
import { can } from "@/lib/manual/permissions";
import { cn } from "@/lib/utils";
import type { SlotProps } from "./slots";

/** 44 px at phone width and on a coarse pointer (the page's other phone targets). */
const PHONE_TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
const QUIET_LINK =
  "inline-flex min-h-[24px] items-center gap-2 self-start rounded-sm text-sm font-medium text-text-brand outline-none hover:text-text-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus";

export function TeamTab({ project, view, viewer }: SlotProps) {
  const team = teamOf(project.contributors ?? []);
  const manages = can(viewer, "people.invite", view.canCtx) || can(viewer, "people.manage", view.canCtx);
  const splits = earnHref(project.id, "splits");

  if (!team.length) {
    if (!can(viewer, "people.seeRoster")) return null;
    return (
      <div className="flex flex-col gap-8">
        <h2 className="text-lg font-bold text-text-primary">Team</h2>
        <StateCard
          tone="empty"
          icon={<Icon icon={UserGroupIcon} size={32} />}
          title="Just you so far"
          body="People you add to this project show here with their role. You add them, and any share of ownership, in Earn › Splits."
          action={
            manages ? (
              <Link
                href={splits}
                className={cn(
                  buttonVariants({ hierarchy: "secondary" }),
                  "hover:text-[color:var(--color-button-secondary-text)]",
                  PHONE_TAP,
                )}
              >
                Open Splits
              </Link>
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-bold text-text-primary">Team</h2>
      <ul className="flex flex-col gap-4">
        {team.map((t) => (
          <li key={t.id} className="flex items-center gap-3">
            <span
              aria-hidden
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-bg-subtle text-xs font-semibold text-text-secondary"
            >
              {initialsOf(t.name)}
            </span>
            <span className="text-md text-text-primary">
              {t.name} <span className="text-text-secondary">· {t.role}</span>
            </span>
          </li>
        ))}
      </ul>
      {manages && (
        <Link href={splits} className={cn(QUIET_LINK, PHONE_TAP)}>
          Add people or change shares in Splits
          <Icon icon={ArrowRight02Icon} size={14} />
        </Link>
      )}
    </div>
  );
}
