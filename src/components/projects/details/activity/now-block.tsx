"use client";

// The viewer's Activity (spec §7.1; UX study 2026-10-13): a target's newest
// entry — "Now" for a project or product, "Latest" for an NFT — with its type,
// date and age, description (4 lines, or 2 when compact, then Show more), proof
// tiles and links; then "Earlier ({n})", a disclosure that opens the rest
// inline, newest first, the default Planning last. A visible heading names
// what the block is about ("Project activity", "Physical copies of VoxLamp ·
// Activity") and names the region for a screen reader, so blocks never read
// alike. Read-only: no ⋮, no Add, no price snapshot. With no history it shows
// `emptyNote` when given ("No activity yet · listed 3 Oct"), else nothing.

import * as React from "react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza";
import { ageOf, historyOf, labelOf, type ActivityTarget, type JourneyEntry, type MediaRef } from "@/lib/manual/journey";
import { useJourney } from "@/lib/manual/journey-store";
import { formatDate } from "@/lib/manual/project-summary";
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
  compact = false,
  heading,
  mode = "now",
  emptyNote,
  className,
}: {
  projectId: string;
  target: ActivityTarget;
  /** The default Planning's date (project or product); absent for an NFT. */
  defaultAt?: number;
  /** The rail's NFT cards: a 2-line description and tighter spacing. */
  compact?: boolean;
  /** What the block is about, shown and used as the region's name. Absent inside a block that already says it. */
  heading?: string;
  /** "now" for a project's or product's stage; "latest" for an NFT's news. */
  mode?: "now" | "latest";
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

  return (
    <section
      {...(heading ? { "aria-labelledby": headingId } : { "aria-label": "Activity" })}
      className={cn("flex flex-col gap-3 rounded-xl border border-solid border-border", compact ? "p-3" : "p-4", className)}
    >
      {heading && (
        <h3 id={headingId} className="m-0 text-sm font-semibold text-text-primary">
          {heading}
        </h3>
      )}
      {!current && <p className="m-0 text-sm text-text-secondary">{emptyNote}</p>}
      {current && (
        <NowEntry entry={current} lead={mode === "now" ? "Now" : "Latest"} now={now} compact={compact} onOpenMedia={openMedia} onOpenLink={openLink} />
      )}
      {earlier.length > 0 && (
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
          <ol id={listId} hidden={!open} role="list" className={cn("m-0 list-none flex-col p-0", open ? "flex" : "hidden")}>
            {earlier.map((e) => (
              <li key={e.id} className="border-t border-solid border-border py-3 last:pb-0">
                <NowEntry entry={e} compact onOpenMedia={openMedia} onOpenLink={openLink} />
              </li>
            ))}
          </ol>
        </>
      )}
      {overlay?.kind === "lightbox" && (
        <ActivityLightbox
          media={overlay.media}
          index={overlay.index}
          onIndexChange={(index) => setOverlay((o) => (o?.kind === "lightbox" ? { ...o, index } : o))}
          onClose={() => setOverlay(null)}
        />
      )}
      {overlay?.kind === "link" && <LinkConfirmDialog url={overlay.url} onClose={() => setOverlay(null)} />}
    </section>
  );
}

function NowEntry({
  entry,
  lead,
  now,
  compact,
  onOpenMedia,
  onOpenLink,
}: {
  entry: JourneyEntry;
  /** The newest entry: "Now" or "Latest", its type as a pill, and its age. */
  lead?: "Now" | "Latest";
  now?: number;
  compact: boolean;
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
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {lead && <span className="text-sm text-text-tertiary">{lead}</span>}
        {lead ? <Badge tone="brand-outline">{label}</Badge> : <span className="text-sm font-semibold text-text-primary">{label}</span>}
        <time dateTime={new Date(entry.createdAt).toISOString()} className="text-sm text-text-tertiary">
          {formatDate(entry.createdAt)}
        </time>
        {lead && now !== undefined && <span className="text-sm text-text-tertiary">· {ageOf(entry.createdAt, now)}</span>}
      </div>
      {entry.description && (
        <p
          ref={descRef}
          id={descId}
          className={cn("m-0 text-sm text-text-primary", !more && (compact ? "line-clamp-2" : "line-clamp-4"))}
        >
          {entry.description}
        </p>
      )}
      {(clamped || more) && (
        <button type="button" aria-controls={descId} aria-expanded={more} onClick={() => setMore((v) => !v)} className={QUIET_BUTTON}>
          {more ? "Show less" : "Show more"}
        </button>
      )}
      <EntryProof entry={entry} onOpenMedia={onOpenMedia} onOpenLink={onOpenLink} />
    </div>
  );
}
