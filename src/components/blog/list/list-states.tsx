"use client";

// What "Your blogs" says when there are no rows to show, in the Figma's words
// ("blog", "Create a new blog"). A first visit teaches the three steps and
// offers Create a new blog; a store that can't be read says so and that nothing
// is written over it. Both replace the list, so they are the DS StateCard. A
// status that holds nothing and a search or filters with no match sit inside
// the list's own surface, under the toolbar, so they are the StateCard's
// content without its card (never a card inside a card), and they offer the way
// back — never a second Create button (the toolbar has it).

import * as React from "react";
import NextLink from "next/link";
import {
  AlertCircleIcon,
  CancelCircleIcon,
  Clock01Icon,
  FilterIcon,
  PencilEdit02Icon,
  RefreshIcon,
  Search01Icon,
  StarIcon,
  Tick02Icon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Badge, Button, StateCard, buttonVariants } from "@/components/ideeza";
import { newArticleHref } from "@/lib/blog/slug";
import type { DisplayStatus } from "@/lib/blog/status";
import { cn } from "@/lib/utils";

const STEPS = ["You write", "The IDEEZA team reviews it", "It's published"] as const;
const TAP = "[@media(pointer:coarse)]:min-h-[var(--touch-min)]";

export function FirstVisitState() {
  return (
    <StateCard
      tone="empty"
      icon={<Icon icon={PencilEdit02Icon} size={32} />}
      title="Write your first blog"
      body="Share how you built something, what went wrong, or tips for other makers."
      action={
        <div className="flex flex-col items-center gap-10">
          <ol
            aria-label="How it works"
            className="m-0 flex list-none items-center gap-4 p-0 text-sm leading-sm text-text-secondary [@container(max-width:479px)]:flex-col [@container(max-width:479px)]:items-start"
          >
            {STEPS.map((step, i) => (
              <React.Fragment key={step}>
                {i > 0 && (
                  <li aria-hidden className="text-text-tertiary [@container(max-width:479px)]:hidden">
                    →
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <Badge tone="neutral">{i + 1}</Badge>
                  {step}
                </li>
              </React.Fragment>
            ))}
          </ol>
          <NextLink href={newArticleHref()} className={cn(buttonVariants({ hierarchy: "primary", size: "lg" }), TAP)}>
            Create a new blog
          </NextLink>
        </div>
      }
      className="mx-auto"
    />
  );
}

export function UnreadableState() {
  return (
    <StateCard
      tone="error"
      icon={<Icon icon={AlertCircleIcon} size={32} />}
      title="Your blogs can't be shown"
      body="The blogs saved in this browser couldn't be read. They've been left as they are, so nothing will be overwritten."
      className="mx-auto"
    />
  );
}

/** The StateCard's content, inside the list's surface. */
function ListMessage({ icon, title, body, action }: { icon: IconValue; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-10 px-8 py-16 text-center">
      <span aria-hidden className="inline-flex size-[80px] items-center justify-center rounded-full bg-bg-subtle text-text-tertiary">
        <Icon icon={icon} size={32} />
      </span>
      <div className="flex max-w-[62ch] flex-col gap-2">
        <p className="m-0 text-2xl font-semibold leading-2xl text-text-primary">{title}</p>
        {body && <p className="m-0 text-md leading-md text-text-secondary">{body}</p>}
      </div>
      {action}
    </div>
  );
}

const EMPTY_STATUS: Record<DisplayStatus, { icon: IconValue; title: string; body: string }> = {
  featured: { icon: StarIcon, title: "No featured blogs", body: "When the IDEEZA team picks one of your approved blogs to feature, it shows up here." },
  approved: { icon: Tick02Icon, title: "No approved blogs", body: "Once the IDEEZA team approves a blog, it's published on the IDEEZA Blog and shows up here." },
  draft: { icon: PencilEdit02Icon, title: "No drafts", body: "Blogs you start and don't publish yet show up here." },
  resubmitted: { icon: RefreshIcon, title: "No re-submitted blogs", body: "A blog you publish again after changes waits here while the IDEEZA team reviews it." },
  removed: { icon: ViewOffSlashIcon, title: "No removed blogs", body: "If the IDEEZA team removes one of your blogs, it shows up here with the reasons." },
  pending: { icon: Clock01Icon, title: "No pending blogs", body: "When you publish a blog, it waits here while the IDEEZA team reviews it." },
  rejected: { icon: CancelCircleIcon, title: "No rejected blogs", body: "When the IDEEZA team asks for changes, the blog shows up here with the reasons." },
};

/** The Status filter alone narrows the list, and that status holds nothing. */
export function EmptyStatusState({ status, onShowAll }: { status: DisplayStatus; onShowAll: () => void }) {
  const copy = EMPTY_STATUS[status];
  return (
    <ListMessage
      icon={copy.icon}
      title={copy.title}
      body={copy.body}
      action={
        <Button type="button" hierarchy="secondary" size="lg" onClick={onShowAll} className={TAP}>
          Show all blogs
        </Button>
      }
    />
  );
}

/** The search, the filters or both found nothing. Each way out takes away what narrowed it. */
export function NoMatchState({
  query,
  filtered,
  onClearSearch,
  onClearFilters,
}: {
  query: string;
  filtered: boolean;
  onClearSearch: () => void;
  onClearFilters: () => void;
}) {
  const q = query.trim();
  const title = !filtered ? `No blogs called “${q}”` : q ? `No blogs called “${q}” with these filters` : "No blogs match these filters";
  const body = filtered ? "Try another status, reuse access or date range." : "Check the spelling or try another word.";
  return (
    <ListMessage
      icon={filtered ? FilterIcon : Search01Icon}
      title={title}
      body={body}
      action={
        <div className="flex flex-wrap items-center justify-center gap-4">
          {q && (
            <Button type="button" hierarchy="secondary" size="lg" onClick={onClearSearch} className={TAP}>
              Clear search
            </Button>
          )}
          {filtered && (
            <Button type="button" hierarchy={q ? "ghost" : "secondary"} size="lg" onClick={onClearFilters} className={TAP}>
              Clear filters
            </Button>
          )}
        </div>
      }
    />
  );
}
