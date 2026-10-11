"use client";

// The My projects card (spec §3.2, §5.2 LST-32…65, as the owner simplified it
// on 2026-10-11) and the list's render states: the loading skeleton (LST-51)
// and the empty bodies — no projects at all (LST-52), an empty tab (LST-53),
// the Showcase filter finding nothing, and no search match (LST-54). One
// ProjectSummary (src/lib/manual/project-summary.ts) feeds this card and the
// details header alike (LST-32), so the two can't drift; every display string
// on the card comes from `cardText()`, never a hand-rolled date/count join.
//
// The card shows three things — the status chip, the title, one line — and a
// hint at its foot. It has no button: the whole card is one link to the
// project (the title's link stretched over it), and the hint is plain text.
// The source, the version and the status line live on the project page.
//
// Grid vs. row (LST-56, LST-57) is one DOM tree that repaints itself via a
// container query on the list's own content box ([container-type:inline-size],
// set by my-projects.tsx on the <ul>) — never the window, because the
// sidebar changes the available width independently of the viewport.
// Below a 560px content box the chip can't float over a 96×60 thumbnail the
// way it does over a 16:10 cover, so it's rendered twice — once inline beside
// the title, once absolute over the cover — and whichever the container query
// doesn't match is `hidden`. Same content, two positions.

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight02Icon,
  CpuIcon,
  ImageNotFound01Icon,
  File01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, StateCard } from "@/components/ideeza";
import { StatusChip, ICONS } from "./status-chip";
import { cardText, type IconName, type ProjectSummary, type ListQuery } from "@/lib/manual/project-summary";

// ───────────────────────── the card ─────────────────────────

export function ProjectCard({
  summary,
  matchedProductName,
  onBeforeNavigate,
  now,
}: {
  summary: ProjectSummary;
  /** The product the search matched when it isn't the first (LST-14). */
  matchedProductName?: string;
  onBeforeNavigate?: () => void;
  /** The list's minute clock, for the date math in `cardText()` (today's time
   *  vs. a bare date). One clock for the page, not one per card; render never
   *  reads `Date.now()` itself (react-hooks/purity). */
  now: number;
}) {
  const [imgOk, setImgOk] = React.useState(true);
  const hasCover = Boolean(summary.cover);
  const text = cardText(summary, now);
  const chip = <StatusChip status={summary.status} word={text.chip.word} showcased={text.chip.badge !== null} />;

  return (
    <article className="relative flex h-full flex-col gap-[10px] overflow-hidden rounded-[12px] border border-solid border-border bg-bg-surface p-[10px] transition-colors duration-normal ease-decelerate hover:border-border-strong has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-border-focus has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-bg-page motion-reduce:transition-none [@container(min-width:560px)]:gap-0 [@container(min-width:560px)]:p-0">
      <div className="flex gap-[12px] [@container(min-width:560px)]:block">
        <div className="relative h-[60px] w-[96px] shrink-0 overflow-hidden rounded-[8px] bg-bg-surface-raised [@container(min-width:560px)]:aspect-[16/10] [@container(min-width:560px)]:h-auto [@container(min-width:560px)]:w-full [@container(min-width:560px)]:rounded-none">
          {hasCover && imgOk ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={summary.cover!}
              alt=""
              loading="lazy"
              decoding="async"
              onError={() => setImgOk(false)}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-[4px] text-text-tertiary">
              <Icon icon={hasCover ? ImageNotFound01Icon : CpuIcon} size={18} strokeWidth={1.4} />
              {hasCover && (
                <span className="px-[6px] text-center text-[10px] leading-tight">Image didn&apos;t load</span>
              )}
            </div>
          )}

          {/* Grid mode only: the chip floats over the cover (LST-35). */}
          <span className="pointer-events-none absolute right-[10px] top-[10px] hidden [@container(min-width:560px)]:inline-flex">
            {chip}
          </span>
        </div>

        <div className="min-w-0 flex-1 [@container(min-width:560px)]:px-[14px] [@container(min-width:560px)]:pt-[12px]">
          <div className="flex flex-wrap items-start justify-between gap-[6px]">
            <h3 className="line-clamp-2 min-w-0 text-lg font-medium text-text-primary">
              {/* The card's one link: its ::after covers the whole <article>. */}
              <Link
                href={`/projects/${summary.id}`}
                title={summary.name}
                onClick={onBeforeNavigate}
                className="outline-none after:absolute after:inset-0 hover:underline focus-visible:underline"
              >
                {summary.name}
              </Link>
            </h3>
            {/* Row mode only: the chip sits beside the title (LST-57). */}
            <span className="flex shrink-0 items-center [@container(min-width:560px)]:hidden">{chip}</span>
          </div>

          <p className="mt-[4px] truncate text-md text-text-tertiary">
            {text.count} ·{" "}
            <time dateTime={text.time.dateTime} title={text.time.title}>
              {text.time.text}
            </time>
            {matchedProductName && <span> · matches {matchedProductName}</span>}
          </p>
        </div>
      </div>

      {/* The hint: text, not a control. mt-auto keeps it on the card's floor, so a row's hints line up. */}
      <p className="mt-auto flex min-w-0 items-center gap-[6px] text-sm font-medium text-text-secondary [@container(max-width:559px)]:pl-[108px] [@container(min-width:560px)]:px-[14px] [@container(min-width:560px)]:pb-[14px] [@container(min-width:560px)]:pt-[12px]">
        <span className="truncate">{text.hint}</span>
        <Icon icon={ArrowRight02Icon} size={14} className="shrink-0" />
      </p>
    </article>
  );
}

// ───────────────────────── loading (LST-51) ─────────────────────────

/** One of six, in the grid shape: cover block, the title, the line and the
 *  hint on the card's floor. `motion-safe:animate-pulse` is Tailwind's own
 *  reduced-motion gate — under `prefers-reduced-motion` these stay static
 *  muted blocks instead of shimmering. */
export function ProjectCardSkeleton() {
  return (
    <div
      aria-hidden
      className="flex h-full flex-col gap-[10px] overflow-hidden rounded-[12px] border border-border bg-bg-surface p-[14px]"
    >
      <div className="aspect-[16/10] rounded-[8px] bg-bg-surface-raised motion-safe:animate-pulse" />
      <div className="h-[16px] w-3/4 rounded bg-bg-surface-raised motion-safe:animate-pulse" />
      <div className="h-[13px] w-1/2 rounded bg-bg-surface-raised motion-safe:animate-pulse" />
      <div className="mt-auto h-[13px] w-1/3 rounded bg-bg-surface-raised motion-safe:animate-pulse" />
    </div>
  );
}

// ───────────────────────── empty states ─────────────────────────

/** LST-52: no projects anywhere. The caller hides the tabs and toolbar. */
export function NoProjectsState({ onGoHome }: { onGoHome: () => void }) {
  return (
    <StateCard
      tone="empty"
      icon={<Icon icon={File01Icon} size={32} />}
      title="No projects yet"
      body="Describe an idea on Home and save the build. It shows up here."
      action={
        <Button type="button" hierarchy="primary" size="md" onClick={onGoHome}>
          Go to Home
        </Button>
      }
      className="mx-auto mt-[24px]"
    />
  );
}

/** LST-54: a search (on any tab, with or without the Showcase filter) came back empty. */
export function NoMatchState({
  query,
  scopeLabel,
  onClearSearch,
  onSearchAll,
}: {
  query: string;
  /** Where the search looked: the tab's label, "(Showcase only)" added when the filter is on. */
  scopeLabel: string;
  onClearSearch: () => void;
  onSearchAll?: () => void;
}) {
  return (
    <StateCard
      tone="empty"
      icon={<Icon icon={Search01Icon} size={32} />}
      title={`No matches for "${query}"`}
      body={`Nothing in ${scopeLabel} has that in a project or product name or description.`}
      action={
        <div className="flex flex-wrap items-center justify-center gap-[10px]">
          <Button type="button" hierarchy="secondary" size="md" onClick={onClearSearch}>
            Clear search
          </Button>
          {onSearchAll && (
            <Button type="button" hierarchy="ghost" size="md" onClick={onSearchAll}>
              Search all projects
            </Button>
          )}
        </div>
      }
      className="mx-auto mt-[24px]"
    />
  );
}

/** LST-53: one short sentence per outcome tab, no button. */
const EMPTY_TAB_COPY: Record<Exclude<ListQuery["tab"], "all">, { title: string; body?: string; icon: IconName }> = {
  draft: { title: "Nothing in progress", body: "A build you save starts here.", icon: "circle" },
  minted: { title: "Nothing minted yet", body: "Open a draft and mint it.", icon: "hexagon" },
  listed: { title: "Nothing on the marketplace", body: "Open a minted project and sell it.", icon: "tag" },
  sold: { title: "Nothing sold yet", icon: "badge-check" },
};

export function EmptyTabState({ tab }: { tab: Exclude<ListQuery["tab"], "all"> }) {
  const copy = EMPTY_TAB_COPY[tab];
  return (
    <StateCard
      tone="empty"
      icon={<Icon icon={ICONS[copy.icon]} size={32} />}
      title={copy.title}
      body={copy.body}
      className="mx-auto mt-[24px]"
    />
  );
}

/** The Showcase only filter found nothing. `tabLabel` names the tab when other
 *  tabs do hold a showcased project, so the sentence stays true. */
export function NoShowcaseState({ tabLabel }: { tabLabel: string | null }) {
  return (
    <StateCard
      tone="empty"
      icon={<Icon icon={ICONS.eye} size={32} />}
      title={tabLabel ? `Nothing shared in ${tabLabel}` : "Nothing shared to Innovations yet"}
      className="mx-auto mt-[24px]"
    />
  );
}
