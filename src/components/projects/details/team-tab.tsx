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
//
// The owner's ways into Messages (Messages spec §6): "Team conversation" beside
// the heading (the project's one group conversation) and "Message" at the end
// of each row (a direct conversation about the team).

import Link from "next/link";
import { ArrowRight02Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { StateCard, buttonVariants } from "@/components/ideeza";
import { initialsOf, teamOf } from "@/lib/manual/contributors";
import { earnHref } from "@/lib/manual/earn-route";
import { can } from "@/lib/manual/permissions";
import { startHref } from "@/lib/messages/links";
import { ME } from "@/lib/messages/types";
import { cn } from "@/lib/utils";
import type { SlotProps } from "./slots";

/** 44 px at phone width and on a coarse pointer (the page's other phone targets). */
const PHONE_TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
const QUIET_LINK =
  "inline-flex min-h-[24px] items-center gap-2 self-start rounded-sm text-md font-medium text-text-brand outline-none hover:text-text-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus";
/** The Messages links, at reading size. */
const MESSAGE_LINK =
  "inline-flex min-h-[24px] shrink-0 items-center rounded-sm text-md font-medium leading-md text-text-brand outline-none hover:text-text-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus";

export function TeamTab({ project, view, viewer }: SlotProps) {
  const team = teamOf(project.contributors ?? []);
  const manages = can(viewer, "people.invite", view.canCtx) || can(viewer, "people.manage", view.canCtx);
  const splits = earnHref(project.id, "splits");
  const owner = viewer.kind === "local-owner";

  if (!team.length) {
    if (!can(viewer, "people.seeRoster")) return null;
    return (
      <div className="flex flex-col gap-8">
        <h2 className="text-2xl font-semibold leading-2xl text-text-primary">Team</h2>
        <StateCard
          tone="empty"
          icon={<Icon icon={UserGroupIcon} size={32} />}
          title="Just you so far"
          body="People you add to this project show here with their role. You add them, and any share of ownership, in Earn › Money › Splits."
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
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2">
        <h2 className="text-2xl font-semibold leading-2xl text-text-primary">Team</h2>
        {owner && (
          <Link href={startHref({ kind: "team", projectId: project.id }, ME)} className={cn(MESSAGE_LINK, PHONE_TAP)}>
            Team conversation
          </Link>
        )}
      </div>
      <ul className="flex flex-col gap-4">
        {team.map((t) => (
          <li key={t.id} className="flex items-center gap-3">
            <span
              aria-hidden
              className="inline-flex size-[24px] shrink-0 items-center justify-center rounded-full bg-bg-subtle text-sm font-semibold text-text-secondary"
            >
              {initialsOf(t.name)}
            </span>
            <span className="min-w-0 text-md text-text-primary">
              {t.name} <span className="text-text-secondary">· {t.role}</span>
            </span>
            {owner && (
              <Link
                href={startHref({ kind: "direct", to: t.id, projectId: project.id, about: { kind: "team" } }, ME)}
                aria-label={`Message ${t.name}`}
                className={cn(MESSAGE_LINK, PHONE_TAP, "ml-auto")}
              >
                Message
              </Link>
            )}
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
