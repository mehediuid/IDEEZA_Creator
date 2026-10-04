"use client";

// The My projects card (spec §3.2, §5.2 LST-32…65) and the list's four
// render states: the loading skeleton (LST-51) and the three empty bodies —
// no projects at all (LST-52), an empty tab (LST-53), no search match
// (LST-54). One ProjectSummary (src/lib/manual/project-summary.ts) feeds
// this card and the details header alike (LST-32), so the two can't drift;
// every display string on the card comes from `cardText()`, never a
// hand-rolled date/count join.
//
// No ⋮ menu, no step bar and no carousel dots (LST-49): every other action
// the old card carried in a kebab now lives on the project page instead.
//
// StatusChip/ShowcaseChip live in ./status-chip (B2 amendment) so C2's
// details header can reuse them rather than building them again.
//
// Grid vs. row (LST-56, LST-57) is one DOM tree that repaints itself via a
// container query on the list's own content box ([container-type:inline-size],
// set by my-projects.tsx on the <ul>) — never the window, because the
// sidebar changes the available width independently of the viewport.
// Below a 560px content box the chip and Showcase badge can't float over a
// 96×60 thumbnail the way they do over a 16:10 cover, so they're rendered
// twice — once inline beside the title, once absolute over the cover — and
// whichever the container query doesn't match is `hidden`. Same content,
// two positions; nothing here can disagree with itself because both come
// from the same `summary`.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CpuIcon, ImageNotFound01Icon, File01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, StateCard } from "@/components/ideeza";
import { StatusChip, ShowcaseChip, ICONS } from "./status-chip";
import { cardText, type ProjectSummary, type CardText, type ListQuery } from "@/lib/manual/project-summary";

// ───────────────────────── meta row ─────────────────────────

/** LST-38 · LST-41 · LST-42 — "AI build · Saved 4:12 PM · Version 2". Every
 *  segment is already the exact display text `cardText()` computed; the
 *  source segment (index 0) alone carries `sourceTip` ("AI build · not in
 *  this browser" gets a tooltip explaining why). A `time` segment renders as
 *  a real `<time>`, its title the unconditional full date. The titled
 *  segments are `relative`, so they sit above the title link's stretched
 *  hit area and their own tooltips show (LST-41). */
function MetaRow({ text }: { text: CardText }) {
  return (
    <>
      {text.meta.map((part, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span aria-hidden>·</span>}
          {part.kind === "time" ? (
            <time dateTime={part.time.dateTime} title={part.time.title} className="relative">
              {part.time.text}
            </time>
          ) : (
            <span
              title={i === 0 ? (text.sourceTip ?? undefined) : undefined}
              className={i === 0 && text.sourceTip ? "relative" : undefined}
            >
              {part.text}
            </span>
          )}
        </React.Fragment>
      ))}
    </>
  );
}

// ───────────────────────── next-action button ─────────────────────────

/** LST-40: shows `cardText().action` (== `summary.next.card`, with its
 *  aria-label already built), "Opening…" while it navigates, a second press
 *  blocked — the same press-state every LeaveButton on the details page
 *  uses, kept local here so this file has no dependency on that page's
 *  module. A card without a violet step shows no button (Phase 2 §2.5). */
function NextActionButton({
  action,
  onBeforeNavigate,
}: {
  action: NonNullable<CardText["action"]>;
  onBeforeNavigate?: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  return (
    <Button
      type="button"
      hierarchy="secondary"
      size="md"
      className="w-full [@container(max-width:559px)]:min-h-[44px]"
      disabled={busy}
      aria-label={action.ariaLabel}
      onClick={() => {
        if (busy) return;
        setBusy(true);
        onBeforeNavigate?.();
        router.push(action.href);
      }}
    >
      {busy ? "Opening…" : action.label}
    </Button>
  );
}

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

  return (
    <article className="flex h-full flex-col gap-[10px] overflow-hidden rounded-[12px] border border-border bg-bg-surface p-[10px] [@container(min-width:560px)]:gap-0 [@container(min-width:560px)]:p-0">
      <div className="relative flex gap-[12px] [@container(min-width:560px)]:block">
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

          {/* Grid mode only: chip + badge float over the cover (LST-35, LST-65). */}
          {summary.showcase && (
            <span className="pointer-events-none absolute left-[10px] top-[10px] hidden [@container(min-width:560px)]:inline-flex">
              <ShowcaseChip />
            </span>
          )}
          <span className="pointer-events-none absolute right-[10px] top-[10px] hidden [@container(min-width:560px)]:inline-flex">
            <StatusChip status={summary.status} word={summary.statusWord} />
          </span>
        </div>

        <div className="min-w-0 flex-1 [@container(min-width:560px)]:px-[14px] [@container(min-width:560px)]:pt-[12px]">
          <div className="flex flex-wrap items-start justify-between gap-[6px]">
            <h3 className="line-clamp-2 min-w-0 text-lg font-medium text-text-primary">
              <Link
                href={`/projects/${summary.id}`}
                title={summary.name}
                className="outline-none after:absolute after:inset-0 hover:underline focus-visible:underline"
              >
                {summary.name}
              </Link>
            </h3>
            {/* Row mode only: chip + badge sit beside the title (LST-57). */}
            <span className="flex shrink-0 items-center gap-[6px] [@container(min-width:560px)]:hidden">
              {summary.showcase && <ShowcaseChip />}
              <StatusChip status={summary.status} word={summary.statusWord} />
            </span>
          </div>

          <p className="mt-[4px] truncate text-md text-text-tertiary">
            {text.productLine}
            {matchedProductName && <span> · matches {matchedProductName}</span>}
          </p>
          <p className="mt-[2px] line-clamp-2 text-md text-text-secondary">{summary.statusLine}</p>
          <p className="mt-[4px] flex flex-wrap items-center gap-x-[6px] text-sm font-medium text-text-tertiary">
            <MetaRow text={text} />
          </p>
        </div>
      </div>

      {text.action && (
        <div className="[@container(min-width:560px)]:mx-[14px] [@container(min-width:560px)]:mb-[14px]">
          <NextActionButton action={text.action} onBeforeNavigate={onBeforeNavigate} />
        </div>
      )}
    </article>
  );
}

// ───────────────────────── loading (LST-51) ─────────────────────────

/** One of six, in the grid shape: cover block, two bars, a status-line bar,
 *  a button block. `motion-safe:animate-pulse` is Tailwind's own
 *  reduced-motion gate — under `prefers-reduced-motion` these stay static
 *  muted blocks instead of shimmering. */
export function ProjectCardSkeleton() {
  return (
    <div
      aria-hidden
      className="flex flex-col gap-[10px] overflow-hidden rounded-[12px] border border-border bg-bg-surface p-[14px]"
    >
      <div className="aspect-[16/10] rounded-[8px] bg-bg-surface-raised motion-safe:animate-pulse" />
      <div className="h-[16px] w-3/4 rounded bg-bg-surface-raised motion-safe:animate-pulse" />
      <div className="h-[13px] w-1/2 rounded bg-bg-surface-raised motion-safe:animate-pulse" />
      <div className="h-[13px] w-2/3 rounded bg-bg-surface-raised motion-safe:animate-pulse" />
      <div className="h-[36px] w-full rounded-lg bg-bg-surface-raised motion-safe:animate-pulse" />
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
      body="A project starts on Home. Describe an idea and Generate with AI, then press Save Project on the finished build — or pick Build manually to start from an empty board. Either way it lands here."
      action={
        <Button type="button" hierarchy="primary" size="md" onClick={onGoHome}>
          Go to Home
        </Button>
      }
      className="mx-auto mt-[24px]"
    />
  );
}

/** LST-54: a search (on any tab or facet) came back empty. */
export function NoMatchState({
  query,
  tabLabel,
  onClearSearch,
  onSearchAll,
  source,
}: {
  query: string;
  tabLabel: string;
  onClearSearch: () => void;
  onSearchAll?: () => void;
  /** With no search text, the Source filter alone emptied the list: name it
   *  and offer to remove it instead. */
  source?: { label: string; onClear: () => void };
}) {
  const byFilter = !query.trim() && source !== undefined;
  return (
    <StateCard
      tone="empty"
      icon={<Icon icon={Search01Icon} size={32} />}
      title={byFilter ? `No projects match “Source: ${source.label}”` : `No matches for "${query}"`}
      body={
        byFilter
          ? `Nothing in ${tabLabel} matches this Source filter.`
          : `Nothing in ${tabLabel} has that in a project or product name or description.`
      }
      action={
        <div className="flex flex-wrap items-center justify-center gap-[10px]">
          <Button
            type="button"
            hierarchy="secondary"
            size="md"
            onClick={byFilter ? source.onClear : onClearSearch}
          >
            {byFilter ? "Clear filter" : "Clear search"}
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

/** LST-53: teaching copy, no button, one entry per real tab. */
const EMPTY_TAB_COPY: Record<Exclude<ListQuery["tab"], "all">, { title: string; body: string; icon: keyof typeof ICONS }> = {
  draft: {
    title: "No drafts",
    body: "Every project here has been minted. A build you save starts as a draft.",
    icon: "circle",
  },
  private: {
    title: "Nothing saved as private yet",
    body: "In a project's brief, choose Save as Private and mint. Only you can see it.",
    icon: "lock",
  },
  given: {
    title: "Nothing given to the community yet",
    body: "In a project's brief, choose Give to Community and mint.",
    icon: "hand-heart",
  },
  listed: {
    title: "Nothing listed yet",
    body: "Open a minted project and press Add to marketplace — or choose Sell in a project's Brief.",
    icon: "tag",
  },
  sold: {
    title: "Nothing sold yet",
    body: "When a buyer buys one of your listings, the project moves here.",
    icon: "badge-check",
  },
  showcase: {
    title: "Nothing showcased yet",
    body: "Showcase a minted project from its page, or when its brief finishes. Nothing is posted until Innovations opens.",
    icon: "eye",
  },
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
