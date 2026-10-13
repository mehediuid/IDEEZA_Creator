"use client";

// A target's Activity, read as a buyer reads it (spec §7.1; UX study
// 2026-10-13; owner's visual pass 2026-10-13: "too much space, boxes in boxes").
// Two shapes, one reading:
// - "block" — the project's or a product's: the newest entry (type pill and
//   age, the exact date on hover), its description (2 lines, Show more) and
//   small proof tiles, then "Earlier (n)" opening the rest inline. `bare` drops
//   its own frame inside a block that already has one (the owner's card).
// - "line" — an NFT's, on its buyer card: one line ("Activity · Milestone ·
//   today ▾") that opens the same details in place, so the price stays up.
// A heading names what it is about for a screen reader ("Main NFT activity"),
// and is shown on a block. Read-only: no ⋮, no Add, no price snapshot. With no
// history it shows `emptyNote` ("No activity yet · listed 3 Oct"), else nothing.

import * as React from "react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza";
import { ageOf, historyOf, labelOf, type ActivityTarget, type JourneyEntry, type MediaRef } from "@/lib/manual/journey";
import { useJourney } from "@/lib/manual/journey-store";
import { formatDate, formatDateTime } from "@/lib/manual/project-summary";
import { cn } from "@/lib/utils";
import { LinkConfirmDialog } from "../link-confirm";
import { useMinuteClock } from "../use-project-page-data";
import { ActivityLightbox, EntryProof } from "./entry";

type Overlay = { kind: "lightbox"; media: MediaRef[]; index: number } | { kind: "link"; url: string };

const QUIET_BUTTON =
  "inline-flex min-h-[32px] items-center gap-2 self-start rounded-lg text-sm font-medium text-text-secondary outline-none transition-colors duration-fast hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus max-md:min-h-[var(--touch-min)]";

export function ActivityNow({
  projectId,
  target,
  defaultAt,
  heading,
  label = "Activity",
  mode = "now",
  variant = "block",
  bare = false,
  earlier: showEarlier = true,
  emptyNote,
  className,
}: {
  projectId: string;
  target: ActivityTarget;
  /** The default Planning's date (project or product); absent for an NFT. */
  defaultAt?: number;
  /** What it is about: the block's visible heading, and the region's name for a screen reader. */
  heading?: string;
  /** "line" only: the short word that leads the line ("Activity", "Virtual copies"). */
  label?: string;
  /** "now" for a stage, "latest" for an NFT's news, "none" where the surrounding heading says it. */
  mode?: "now" | "latest" | "none";
  variant?: "block" | "line";
  /** "block" only: no frame of its own. */
  bare?: boolean;
  /** "block" only: false hides Earlier (the owner reaches history through the drawer). */
  earlier?: boolean;
  /** Shown when there is no history yet; without it, nothing renders. */
  emptyNote?: string;
  className?: string;
}) {
  const { hydrated, record } = useJourney(projectId);
  const [open, setOpen] = React.useState(false);
  const [overlay, setOverlay] = React.useState<Overlay | null>(null);
  const listId = React.useId();
  const headingId = React.useId();
  const now = useMinuteClock();
  const history = historyOf(record, projectId, target, defaultAt);
  if (!hydrated || (history.length === 0 && !emptyNote)) return null;
  const [current, ...earlier] = history;
  const openMedia = (media: MediaRef[], index: number) => setOverlay({ kind: "lightbox", media, index });
  const openLink = (url: string) => setOverlay({ kind: "link", url });
  const overlays = (
    <>
      {overlay?.kind === "lightbox" && (
        <ActivityLightbox
          media={overlay.media}
          index={overlay.index}
          onIndexChange={(index) => setOverlay((o) => (o?.kind === "lightbox" ? { ...o, index } : o))}
          onClose={() => setOverlay(null)}
        />
      )}
      {overlay?.kind === "link" && <LinkConfirmDialog url={overlay.url} onClose={() => setOverlay(null)} />}
    </>
  );
  const earlierList = (
    <ol role="list" className="m-0 flex list-none flex-col p-0">
      {earlier.map((e) => (
        <li key={e.id} className="border-t border-solid border-border py-3 last:pb-0">
          <Entry entry={e} now={now} onOpenMedia={openMedia} onOpenLink={openLink} />
        </li>
      ))}
    </ol>
  );

  if (variant === "line") {
    return (
      <section aria-label={heading ?? label} className={cn("flex flex-col", className)}>
        {current ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={listId}
            onClick={() => setOpen((v) => !v)}
            className="flex min-h-[36px] w-full items-center gap-2 rounded-md text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-border-focus max-md:min-h-[var(--touch-min)]"
          >
            <span className="shrink-0 text-text-secondary">{label}</span>
            <Badge tone="brand-outline">{labelOf(current)}</Badge>
            <span className="min-w-0 truncate text-text-tertiary" title={formatDateTime(current.createdAt)}>
              {ageOf(current.createdAt, now)}
            </span>
            <span
              aria-hidden
              className={cn(
                "ml-auto inline-flex shrink-0 text-text-tertiary transition-transform duration-fast motion-reduce:transition-none",
                open && "rotate-180",
              )}
            >
              <Icon icon={ArrowDown01Icon} size={16} />
            </span>
            <span className="sr-only">{open ? "Hide details" : "Show details"}</span>
          </button>
        ) : (
          <p className="m-0 flex min-h-[36px] items-center gap-2 text-sm">
            <span className="text-text-secondary">{label}</span>
            <span className="text-text-tertiary">{emptyNote}</span>
          </p>
        )}
        {current && (
          <div id={listId} hidden={!open} className={cn("flex-col gap-3 pb-1 pt-2", open ? "flex" : "hidden")}>
            <Entry entry={current} now={now} onOpenMedia={openMedia} onOpenLink={openLink} />
            {earlier.length > 0 && earlierList}
          </div>
        )}
        {overlays}
      </section>
    );
  }

  return (
    <section
      {...(heading ? { "aria-labelledby": headingId } : { "aria-label": "Activity" })}
      className={cn("flex flex-col gap-2", !bare && "rounded-xl border border-solid border-border p-3", className)}
    >
      {heading && (
        <h3 id={headingId} className="m-0 text-sm font-semibold text-text-primary">
          {heading}
        </h3>
      )}
      {!current && <p className="m-0 text-sm text-text-secondary">{emptyNote}</p>}
      {current && (
        <Entry
          entry={current}
          now={now}
          lead={mode === "now" ? "Now" : mode === "latest" ? "Latest" : undefined}
          pill
          onOpenMedia={openMedia}
          onOpenLink={openLink}
        />
      )}
      {showEarlier && earlier.length > 0 && (
        <>
          <button type="button" aria-expanded={open} aria-controls={listId} onClick={() => setOpen((v) => !v)} className={QUIET_BUTTON}>
            Earlier ({earlier.length})
            {heading && <span className="sr-only">: {heading}</span>}
            <Icon
              icon={ArrowDown01Icon}
              size={14}
              className={cn("transition-transform duration-fast motion-reduce:transition-none", open && "rotate-180")}
            />
          </button>
          <div id={listId} hidden={!open} className={open ? "block" : "hidden"}>
            {earlierList}
          </div>
        </>
      )}
      {overlays}
    </section>
  );
}

/** One entry: its type (a pill for the newest), age (the exact date on hover), description and proof. */
function Entry({
  entry,
  now,
  lead,
  pill = false,
  onOpenMedia,
  onOpenLink,
}: {
  entry: JourneyEntry;
  now: number;
  /** "Now" or "Latest" before the type; absent where the heading already says it. */
  lead?: "Now" | "Latest";
  /** The type as a pill with its age (the newest entry), rather than plain text with its date. */
  pill?: boolean;
  onOpenMedia: (media: MediaRef[], index: number) => void;
  onOpenLink: (url: string) => void;
}) {
  const [more, setMore] = React.useState(false);
  const [clamped, setClamped] = React.useState(false);
  const descRef = React.useRef<HTMLParagraphElement>(null);
  const descId = React.useId();
  React.useLayoutEffect(() => {
    const el = descRef.current;
    if (el && !more) setClamped(el.scrollHeight > el.clientHeight + 1);
  }, [entry.description, more]);
  const label = labelOf(entry);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {lead && <span className="text-text-tertiary">{lead}</span>}
        {pill ? <Badge tone="brand-outline">{label}</Badge> : <span className="font-semibold text-text-primary">{label}</span>}
        <time dateTime={new Date(entry.createdAt).toISOString()} title={formatDateTime(entry.createdAt)} className="text-text-tertiary">
          {pill ? ageOf(entry.createdAt, now) : formatDate(entry.createdAt)}
        </time>
      </div>
      {entry.description && (
        <p ref={descRef} id={descId} className={cn("m-0 text-sm text-text-secondary", !more && "line-clamp-2")}>
          {entry.description}
        </p>
      )}
      {(clamped || more) && (
        <button type="button" aria-controls={descId} aria-expanded={more} onClick={() => setMore((v) => !v)} className={QUIET_BUTTON}>
          {more ? "Show less" : "Show more"}
        </button>
      )}
      <EntryProof compact entry={entry} onOpenMedia={onOpenMedia} onOpenLink={onOpenLink} />
    </div>
  );
}
