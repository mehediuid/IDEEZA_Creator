"use client";

// The reject-reason panel (Figma frames 21–22), one component for the blog's
// details and Quick view: the error mark, "Reject reason" (or "Removal
// reason"), captions under the title (how many things the latest review asks
// for, what the reasons are about, the demo note), then the reasons grouped by
// review. The latest review comes first under a "Latest review" badge; earlier
// ones fold under "Earlier reviews (n)". Every row keeps its date (frame 22) and
// says what the review found and how to fix it. Folded to the latest reason
// once the blog was sent again (frame 21). A removal is final (owner D-3): its
// rows say what was found, the panel says once that it can't be edited, and
// offers IDEEZA support.

import * as React from "react";
import NextLink from "next/link";
import { Alert02Icon, ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, IconButton, linkVariants } from "@/components/ideeza";
import type { ReasonGroup, ReasonPanel as Panel } from "@/lib/blog/article-view";
import { DEMO_REVIEW_LABEL, DEMO_REVIEW_NOTE } from "@/lib/blog/demo-review";
import { askBlogSupport, removedSubject } from "@/lib/blog/support";
import { cn } from "@/lib/utils";

const TAP = "[@media(pointer:coarse)]:min-h-[var(--touch-min)]";
/** DS Label LG (14/20 SemiBold): the panel's head, like the rail's (owner D-20). */
const HEAD = "m-0 text-md font-semibold leading-md text-text-primary";
const BADGE_MD = "gap-2 px-4 py-2 text-sm leading-xs";

function Rows({ group, which, limit }: { group: ReasonGroup; which: "Latest review" | "Earlier review" | null; limit?: number }) {
  const rows = limit ? group.rows.slice(0, limit) : group.rows;
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {rows.map((r, i) => (
        <li
          key={`${group.at}:${i}`}
          className="flex flex-col gap-2 border-0 border-solid border-border-subtle py-5 first:pt-0 last:pb-0 [&+&]:border-t [@container(min-width:640px)]:flex-row [@container(min-width:640px)]:items-start [@container(min-width:640px)]:justify-between [@container(min-width:640px)]:gap-12"
        >
          <p className="m-0 flex min-w-0 flex-col gap-1 text-md leading-md">
            {which && <span className="sr-only">{which}: </span>}
            <span className="font-medium text-text-primary">{r.title}</span>
            {r.found && <span className="text-text-secondary">{r.found}</span>}
            {r.fix && <span className="text-text-primary">{r.fix}</span>}
          </p>
          <time dateTime={new Date(group.at).toISOString()} className="shrink-0 text-sm leading-sm text-text-secondary">
            {group.date}
          </time>
        </li>
      ))}
    </ul>
  );
}

export function ReasonPanel({
  panel,
  blogTitle,
  headingLevel = 2,
  updateHref,
  className,
}: {
  panel: Panel;
  /** Names the blog when the writer asks IDEEZA support about a removal. */
  blogTitle: string;
  /** 2 on the blog's page; 4 inside Quick view, under its title. */
  headingLevel?: 2 | 4;
  /** Where the update these reasons are about can be read (its preview). */
  updateHref?: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(panel.open);
  const [earlierOpen, setEarlierOpen] = React.useState(false);
  const titleId = React.useId();
  const listId = React.useId();
  const earlierId = React.useId();
  const H = headingLevel === 4 ? "h4" : "h2";
  // The chevron folds the panel whenever there is more than the first reason to show, and always
  // once the blog was sent again (frame 21 draws it folded, with the chevron).
  const foldable = !panel.open || panel.latest.rows.length > 1 || panel.earlier.length > 0;
  const total = panel.latest.rows.length + panel.earlier.reduce((n, g) => n + g.rows.length, 0);

  return (
    <section
      aria-labelledby={titleId}
      className={cn("flex gap-6 rounded-2xl border border-solid border-border bg-bg-surface p-8 [@container(min-width:640px)]:p-12", className)}
    >
      <span
        aria-hidden
        className="flex size-[40px] shrink-0 items-center justify-center rounded-lg border border-solid border-border bg-bg-surface text-[color:var(--color-icon-error)]"
      >
        <Icon icon={Alert02Icon} size={20} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex min-h-[40px] items-center gap-4">
            <H id={titleId} className={HEAD}>
              {panel.title}
            </H>
            {foldable && (
              <IconButton
                hierarchy="ghost"
                size="md"
                className="ml-auto shrink-0 max-md:!size-[var(--touch-min)] [@media(pointer:coarse)]:!size-[var(--touch-min)]"
                aria-label={open ? "Show only the latest reason" : `Show all ${total} reasons`}
                aria-expanded={open}
                aria-controls={listId}
                icon={
                  <span aria-hidden className={cn("inline-flex transition-transform duration-fast", open && "rotate-180")}>
                    <Icon icon={ArrowDown01Icon} size={20} />
                  </span>
                }
                onClick={() => setOpen((v) => !v)}
              />
            )}
          </div>
          {panel.captions.map((c) => (
            <p key={c} className="m-0 text-sm leading-sm text-text-secondary">
              {c}
            </p>
          ))}
          {panel.demo && <p className="m-0 text-sm leading-sm text-text-secondary">{DEMO_REVIEW_NOTE}</p>}
          {panel.aboutUpdate && updateHref && (
            <NextLink href={updateHref} className={cn(linkVariants({ color: "brand", size: "md" }), "self-start font-medium", TAP)}>
              See your update
            </NextLink>
          )}
        </div>

        <div id={listId} className="flex flex-col gap-6">
          {open && panel.kind === "rejected" && (
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="neutral" className={BADGE_MD}>
                Latest review
              </Badge>
              {panel.demo && (
                <Badge tone="neutral" className={BADGE_MD}>
                  {DEMO_REVIEW_LABEL}
                </Badge>
              )}
            </div>
          )}
          <Rows group={panel.latest} which={panel.kind === "rejected" ? "Latest review" : null} limit={open ? undefined : 1} />

          {open && panel.earlier.length > 0 && (
            <div className="flex flex-col gap-6">
              <button
                type="button"
                aria-expanded={earlierOpen}
                aria-controls={earlierId}
                onClick={() => setEarlierOpen((v) => !v)}
                className={cn(
                  "flex w-full items-center gap-4 rounded-sm text-left text-md font-medium leading-md text-text-secondary outline-none transition-colors duration-fast hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus",
                  TAP,
                )}
              >
                <span aria-hidden className="h-px flex-1 bg-border-subtle" />
                <span className="shrink-0">Earlier reviews ({panel.earlier.length})</span>
                <span aria-hidden className={cn("inline-flex shrink-0 transition-transform duration-fast", earlierOpen && "rotate-180")}>
                  <Icon icon={ArrowDown01Icon} size={16} />
                </span>
                <span aria-hidden className="h-px flex-1 bg-border-subtle" />
              </button>
              {earlierOpen && (
                <div id={earlierId} className="flex flex-col gap-6">
                  {panel.earlier.map((g) => (
                    <Rows key={g.at} group={g} which="Earlier review" />
                  ))}
                </div>
              )}
            </div>
          )}

          {panel.final && (
            <div className="flex flex-col items-start gap-2 border-0 border-t border-solid border-border-subtle pt-5">
              <p className="m-0 text-md leading-md text-text-primary">{panel.final}</p>
              <p className="m-0 flex flex-wrap items-center gap-x-2 text-md leading-md text-text-secondary">
                Think this is a mistake?
                <button
                  type="button"
                  onClick={() => askBlogSupport(removedSubject(blogTitle))}
                  className={cn(linkVariants({ color: "brand", size: "lg" }), "font-medium", TAP)}
                >
                  Contact IDEEZA support
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
