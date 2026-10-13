"use client";

// What "Your articles" says when there are no rows to show (content report
// § 2.4). A first visit teaches the three steps and offers New article; a
// store that can't be read says so and that nothing is written over it. Both
// replace the list, so they are the DS StateCard. An empty tab and a search
// with no match sit inside the list's own surface, so they are the StateCard's
// content without its card (never a card inside a card).

import * as React from "react";
import NextLink from "next/link";
import { AlertCircleIcon, Clock01Icon, PencilEdit02Icon, Search01Icon, Tick02Icon, ViewIcon } from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Badge, Button, StateCard, buttonVariants } from "@/components/ideeza";
import { newArticleHref } from "@/lib/blog/slug";
import type { StatusTab } from "@/lib/blog/status";
import { cn } from "@/lib/utils";

const STEPS = ["You write", "IDEEZA team reads it", "It goes live"] as const;

export function FirstVisitState() {
  return (
    <StateCard
      tone="empty"
      icon={<Icon icon={PencilEdit02Icon} size={32} />}
      title="Write your first article"
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
          <NextLink href={newArticleHref()} className={cn(buttonVariants({ hierarchy: "primary", size: "lg" }), "[@media(pointer:coarse)]:min-h-[var(--touch-min)]")}>
            New article
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
      title="Your articles can't be shown"
      body="The articles saved in this browser couldn't be read. They've been left as they are, so nothing will be overwritten."
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

const EMPTY_TAB: Record<Exclude<StatusTab, "all">, { icon: IconValue; title: string; body: string; write?: true }> = {
  drafts: { icon: PencilEdit02Icon, title: "No drafts", body: "Articles you start and don't send yet show up here.", write: true },
  review: { icon: Clock01Icon, title: "Nothing in review", body: "When you send an article, it waits here while the IDEEZA team reads it." },
  needs: { icon: Tick02Icon, title: "Nothing to fix", body: "When the IDEEZA team asks for changes, the article shows up here." },
  live: { icon: ViewIcon, title: "Nothing live yet", body: "Once the IDEEZA team approves an article, it goes live and shows up here." },
};

/** A status tab that holds nothing (the search plays no part). */
export function EmptyTabState({ tab }: { tab: Exclude<StatusTab, "all"> }) {
  const copy = EMPTY_TAB[tab];
  return (
    <ListMessage
      icon={copy.icon}
      title={copy.title}
      body={copy.body}
      action={
        copy.write ? (
          <NextLink href={newArticleHref()} className={cn(buttonVariants({ hierarchy: "primary", size: "lg" }), "[@media(pointer:coarse)]:min-h-[var(--touch-min)]")}>
            New article
          </NextLink>
        ) : undefined
      }
    />
  );
}

/** The search's words, said for the tab it looked in. */
const NO_MATCH: Record<StatusTab, (q: string) => string> = {
  all: (q) => `No articles called “${q}”`,
  drafts: (q) => `No drafts called “${q}”`,
  review: (q) => `Nothing in review called “${q}”`,
  needs: (q) => `No articles needing changes called “${q}”`,
  live: (q) => `No live articles called “${q}”`,
};

/** The search found no title with those words in this tab. From a status tab it
 *  can look again over every article. */
export function NoMatchState({
  tab,
  query,
  onClear,
  onSearchAll,
}: {
  tab: StatusTab;
  query: string;
  onClear: () => void;
  onSearchAll: () => void;
}) {
  const narrowed = tab !== "all";
  return (
    <ListMessage
      icon={Search01Icon}
      title={NO_MATCH[tab](query.trim())}
      body={narrowed ? "Check the spelling, or search all your articles." : "Check the spelling or try another word."}
      action={
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button type="button" hierarchy="secondary" size="lg" onClick={onClear} className="[@media(pointer:coarse)]:min-h-[var(--touch-min)]">
            Clear search
          </Button>
          {narrowed && (
            <Button type="button" hierarchy="ghost" size="lg" onClick={onSearchAll} className="[@media(pointer:coarse)]:min-h-[var(--touch-min)]">
              Search all articles
            </Button>
          )}
        </div>
      }
    />
  );
}
