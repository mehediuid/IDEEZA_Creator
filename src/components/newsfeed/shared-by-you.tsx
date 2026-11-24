"use client";

// "Shared by you" — what this browser's maker put on Innovations, newest
// first, at the top of the page (the feed below is a sample dataset with no
// write path):
// - the projects you shared as your own post (the project page's ⋯ › Share to
//   Innovations; `showcasedAt` on the project): a cover, the name with the
//   project's current activity (its status, here and on the post), its story,
//   its product count and when it was shared, linking to its post — what
//   visitors see, with the maker's own controls on top (plan D8);
// - your shares of a marketplace item, anyone's (owner, 2026-11-22: a re-share
//   as on Facebook, shares/share-item-dialog.tsx): "You shared Leo Park's
//   product" and when, "Only me" when only you can see it, your words, then
//   the original in a bordered card — its creator, picture, title, its project
//   for a product and its Activity — opening its marketplace page. No prices
//   and no product list: a post is one share, not a details page. An item
//   that is gone says so. ⋯ › Remove from Innovations takes the share off,
//   with Undo.
// Nothing renders until the stores are read, or when nothing is shared.

import * as React from "react";
import Link from "next/link";
import { CpuIcon, Delete02Icon, LockIcon, MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Avatar, Badge, IconButton, Menu } from "@/components/ideeza";
import { PAGE_GRID } from "@/components/ideeza/page";
import { usePostToast } from "@/components/innovations/toast";
import { useMinuteClock } from "@/components/projects/details/use-project-page-data";
import { useShareItems, useShares } from "@/components/shares/use-share-items";
import { useCreateHistory } from "@/lib/create/history";
import { agoLabel } from "@/lib/innovations/comments";
import type { FeedShare } from "@/lib/innovations/feed-prefs";
import { ME } from "@/lib/innovations/people";
import { parseShareItemId, sharedHeadOf, webItemHref, type ShareItem } from "@/lib/innovations/share-items";
import { mineSlugOf, postHref } from "@/lib/innovations/slug";
import { buildsOf, coverOf, productRowsOf } from "@/lib/manual/project-read";
import { formatDate, formatDateTime } from "@/lib/manual/project-summary";
import { currentOf, labelOf } from "@/lib/manual/journey";
import { readJourney } from "@/lib/manual/journey-store";
import { useManualProjects } from "@/lib/manual/projects";
import { useMyPhoto } from "@/lib/people/photo-store";
import { useMe } from "@/lib/people/profile-store";

type OwnPost = {
  id: string;
  href: string;
  name: string;
  products: number;
  at: number;
  cover: string | null;
  story: string;
  status: string | null;
};

type Entry = { kind: "post"; at: number; post: OwnPost } | { kind: "share"; at: number; share: FeedShare };

type Sharer = { name: string; initials: string; photo: string | null };

export function SharedByYou() {
  const { projects, hydrated } = useManualProjects();
  const { builds, hydrated: buildsHydrated } = useCreateHistory();
  const { hydrated: itemsHydrated, itemOf } = useShareItems();
  const { hydrated: sharesHydrated, shares, remove, restore } = useShares();
  const toast = usePostToast();
  const now = useMinuteClock();
  const me = useMe();
  const photo = useMyPhoto();
  const headingId = React.useId();

  const posts = React.useMemo(
    () =>
      projects
        .filter((p) => typeof p.showcasedAt === "number")
        .map(
          (p): OwnPost => ({
            id: p.id,
            href: postHref(mineSlugOf(p)),
            name: p.name.trim() || "Untitled project",
            products: productRowsOf(p).length,
            at: p.showcasedAt as number,
            cover: coverOf(p, buildsOf(p, builds)),
            story: p.post?.story.trim() ?? "",
            status: labelOf(
              currentOf(readJourney(p.id), p.id, { kind: "project" }, p.createdAt) ?? { target: { kind: "project" }, type: "planning" },
            ),
          }),
        ),
    [projects, builds],
  );

  // Your own posts and your shares, one list, newest first.
  const entries = React.useMemo(
    () =>
      [
        ...posts.map((post): Entry => ({ kind: "post", at: post.at, post })),
        ...shares.map((share): Entry => ({ kind: "share", at: share.at, share })),
      ].sort((a, b) => b.at - a.at),
    [posts, shares],
  );

  if (!hydrated || !buildsHydrated || !itemsHydrated || !sharesHydrated || entries.length === 0) return null;

  const sharer: Sharer = { name: me.name, initials: me.initials, photo: photo.url };
  const removeShare = (share: FeedShare) => {
    if (!remove(share.id)) {
      toast("Couldn't save that in this browser. Try again.");
      return;
    }
    toast("Removed from Innovations", () => {
      if (!restore(share)) toast("Couldn't put it back in this browser. Try again.");
    });
  };

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-[12px]">
      <h2 id={headingId} className="text-md font-semibold text-text-primary">
        Shared by you
      </h2>
      <ul role="list" className={`m-0 list-none items-start p-0 ${PAGE_GRID}`}>
        {entries.map((e) =>
          e.kind === "post" ? (
            <li key={`post:${e.post.id}`}>
              <OwnPostCard p={e.post} />
            </li>
          ) : (
            <li key={`share:${e.share.id}`}>
              <ShareCard share={e.share} item={itemOf(e.share.clipId)} now={now} sharer={sharer} onRemove={() => removeShare(e.share)} />
            </li>
          ),
        )}
      </ul>
    </section>
  );
}

/** The project's current Activity, as the own-post card and the post draw it. */
const STATUS_PILL = "rounded-full bg-bg-brand-subtle px-[8px] py-[1px] text-xs font-semibold text-text-brand";

/** A project you shared as your own post: its cover, name and status, story, products and date. */
function OwnPostCard({ p }: { p: OwnPost }) {
  return (
    <Link
      href={p.href}
      className="group flex items-start gap-[12px] rounded-xl border border-solid border-border bg-bg-surface p-[10px] outline-none transition-colors duration-normal ease-out hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none"
    >
      <span className="relative flex size-[56px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-bg-subtle text-text-tertiary">
        {p.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <Icon icon={CpuIcon} size={18} />
        )}
      </span>
      <span className="flex min-w-0 flex-col gap-[4px]">
        <span className="flex min-w-0 flex-wrap items-center gap-x-[8px] gap-y-[2px]">
          <span className="truncate text-md font-semibold text-text-primary group-hover:text-text-primary">{p.name}</span>
          {p.status && <span className={STATUS_PILL}>{p.status}</span>}
        </span>
        {p.story && <span className="line-clamp-2 text-sm leading-relaxed text-text-secondary">{p.story}</span>}
        <span className="text-sm text-text-tertiary">{`${p.products} ${p.products === 1 ? "product" : "products"} · Shared ${formatDate(p.at)}`}</span>
      </span>
    </Link>
  );
}

/** A caption this long, or of this many lines, opens clamped with Show more. */
const CAPTION_CLAMP_CHARS = 180;
const CAPTION_CLAMP_LINES = 4;

/** Your share of a marketplace item: who shared what and when, your words, then the original. */
function ShareCard({
  share,
  item,
  now,
  sharer,
  onRemove,
}: {
  share: FeedShare;
  item: ShareItem | null;
  now: number;
  sharer: Sharer;
  onRemove: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const captionId = React.useId();
  // A gone item still says from its id whether it was a project or a product.
  const kind = item?.kind ?? (parseShareItemId(share.clipId)?.productId ? "product" : "project");
  const head = item ? sharedHeadOf("You", item, ME.id) : `You shared a ${kind}`;
  const caption = share.caption.trim();
  const long = caption.length > CAPTION_CLAMP_CHARS || caption.split("\n").length > CAPTION_CLAMP_LINES;

  return (
    <article aria-label={head} className="flex flex-col gap-6 rounded-xl border border-solid border-border bg-bg-surface p-6">
      <div className="flex items-start gap-4">
        <Avatar size="sm" initials={sharer.initials} color={ME.color} src={sharer.photo ?? undefined} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="m-0 break-words text-md font-semibold text-text-primary">{head}</p>
          <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-secondary">
            <time dateTime={new Date(share.at).toISOString()} title={formatDateTime(share.at)}>
              {agoLabel(share.at, now)}
            </time>
            {share.audience === "only-me" && (
              <Badge tone="neutral" icon={<Icon icon={LockIcon} size={12} />}>
                Only me
              </Badge>
            )}
          </p>
        </div>
        <Menu
          label="Share actions"
          align="end"
          items={[{ id: "remove", label: "Remove from Innovations", icon: <Icon icon={Delete02Icon} size={20} />, onSelect: onRemove }]}
          trigger={(props) => (
            <IconButton
              {...props}
              type="button"
              hierarchy="ghost"
              size="sm"
              aria-label="More for this share"
              icon={<Icon icon={MoreHorizontalIcon} size={20} />}
              className="shrink-0"
            />
          )}
        />
      </div>

      {caption && (
        <div className="flex flex-col items-start gap-1">
          <p id={captionId} className={`m-0 whitespace-pre-line text-md text-text-primary [overflow-wrap:anywhere] ${long && !open ? "line-clamp-4" : ""}`}>
            {caption}
          </p>
          {long && (
            <button
              type="button"
              aria-expanded={open}
              aria-controls={captionId}
              onClick={() => setOpen((v) => !v)}
              className="rounded-sm text-sm font-semibold text-text-secondary outline-none hover:text-text-primary hover:underline focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              {open ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      )}

      {item ? (
        <OriginalCard item={item} sharer={sharer} />
      ) : (
        <p className="m-0 rounded-lg border border-solid border-border p-6 text-md text-text-secondary">{`This ${kind} is no longer available.`}</p>
      )}
    </article>
  );
}

/** The shared item itself, with its creator: never a copy, so it opens the item's own marketplace page. */
function OriginalCard({ item, sharer }: { item: ShareItem; sharer: Sharer }) {
  const yours = item.creator.id === ME.id;
  return (
    <Link
      href={webItemHref(item)}
      className="group flex flex-col overflow-hidden rounded-lg border border-solid border-border bg-bg-surface outline-none transition-colors duration-normal ease-out hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none"
    >
      <span className="flex min-w-0 items-center gap-3 px-6 py-4">
        <Avatar size="xs" initials={item.creator.initials} color={item.creator.color} src={yours ? (sharer.photo ?? undefined) : undefined} />
        <span className="truncate text-sm font-semibold text-text-primary">{item.creator.name}</span>
      </span>
      <span className="relative flex aspect-[16/9] w-full items-center justify-center overflow-hidden bg-bg-subtle text-text-tertiary">
        {item.cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- the item's own picture
          <img src={item.cover} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <Icon icon={CpuIcon} size={24} />
        )}
      </span>
      <span className="flex min-w-0 flex-col gap-2 px-6 py-5">
        <span className="line-clamp-2 break-words text-md font-semibold text-text-primary">{item.title}</span>
        {item.projectTitle && <span className="truncate text-sm text-text-secondary">{`from ${item.projectTitle}`}</span>}
        {item.stage && <span className={`self-start ${STATUS_PILL}`}>{item.stage}</span>}
      </span>
    </Link>
  );
}
