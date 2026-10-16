"use client";

// The post's rail (plan §5, mockup Main.dc.html): the maker, the visitor's
// actions with the post's counts, what is on the Marketplace, About and More
// from the maker. Beside the story on a wide page; on a narrow one the page
// places each block in the flow (post-page.tsx), and on a phone the actions
// move to the sticky bar at the bottom (PostActionBar).

import { FollowButton } from "@/components/profile/person-actions";
import { PersonName } from "@/components/profile/person-name";
import { canonicalId } from "@/lib/people/ids";
import * as React from "react";
import Link from "next/link";
import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  Bookmark02Icon,
  BookmarkCheck02Icon,
  Comment01Icon,
  CpuIcon,
  FavouriteIcon,
  Link01Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { useMainScrollPadding } from "@/components/dashboard/main-scroll";
import { AvatarLabelGroup, Badge, Button, buttonVariants, IconButton } from "@/components/ideeza";
import { MessageCreator, useMessageRefusal } from "@/components/newsfeed/creator-row";
import { formatCount } from "@/lib/feed";
import { SAMPLE_POSTS } from "@/lib/innovations/sample-posts";
import { postHref } from "@/lib/innovations/slug";
import { ME_ID, type InnovationPost } from "@/lib/innovations/types";
import { formatDate } from "@/lib/manual/project-summary";
import { useManualProjects } from "@/lib/manual/projects";
import { cn } from "@/lib/utils";
import { CARD, ImageGone, PostImg, scrollToComments, TAP } from "./post-bits";

/** What the actions and the counts line read, worked out once by the page. */
export type PostCounts = {
  appreciated: boolean;
  saved: boolean;
  appreciations: number;
  views: number;
  /** null until the thread is read. */
  comments: number | null;
};

export type PostActions = {
  toggleAppreciate: () => void;
  toggleSave: () => void;
  copyLink: () => void;
};

const firstName = (name: string) => name.split(" ")[0] || name;
const plural = (n: number, one: string, many: string) => `${formatCount(n)} ${n === 1 ? one : many}`;

// ─────────────────────────── maker ───────────────────────────

/** How many posts the maker has on Innovations: this browser's shared projects
 *  for "You", the sample posts for a sample maker. */
function useMakerPostCount(post: InnovationPost): number {
  const { projects } = useManualProjects();
  if (post.creator.id === ME_ID) return projects.filter((p) => typeof p.showcasedAt === "number").length;
  return SAMPLE_POSTS.filter((p) => p.creator.id === post.creator.id).length;
}

/** The maker: a card in the rail, a row under the title on a phone. */
export function MakerBlock({ post, owner, layout, className }: { post: InnovationPost; owner: boolean; layout: "card" | "row"; className?: string }) {
  const count = useMakerPostCount(post);
  const maker = post.creator;
  const supporting = count > 0 ? `${count} ${count === 1 ? "project" : "projects"} on Innovations` : "Nothing on Innovations right now";
  const refusal = useMessageRefusal(maker);
  const reasonId = React.useId();

  const name = (
    <span className="inline-flex min-w-0 items-center gap-3">
      <PersonName id={maker.id} from="innovations" className="truncate">
        {maker.name}
      </PersonName>
      {maker.pro && <Badge tone="neutral">Pro</Badge>}
    </span>
  );
  const follow = owner ? null : (
    <FollowButton
      person={{ id: canonicalId(maker.id, "innovations"), kind: maker.id === ME_ID ? "me" : "feed", name: maker.name }}
      hierarchy="secondary"
      size="md"
      className={cn(TAP, layout === "card" && "w-full")}
    />
  );
  const message = owner ? null : (
    <MessageCreator creator={maker} slug={post.slug} refusal={refusal} reasonId={reasonId} className={cn(TAP, layout === "card" && "w-full")} />
  );
  const why = refusal && !owner && (
    <p id={reasonId} className="m-0 max-w-[62ch] text-md leading-md text-text-secondary">
      {refusal}
    </p>
  );

  if (layout === "row") {
    return (
      <div className={cn("flex flex-col gap-4", className)}>
        <div className="flex flex-wrap items-center gap-6">
          <AvatarLabelGroup size="md" initials={maker.initials} color={maker.color} name={name} supporting={supporting} className="min-w-[min(100%,200px)] flex-1" />
          {follow && (
            <div className="flex shrink-0 items-center gap-4">
              {follow}
              {message}
            </div>
          )}
        </div>
        {why}
      </div>
    );
  }
  return (
    <section aria-label={`The maker, ${maker.name}`} className={cn(CARD, "flex flex-col gap-7", className)}>
      <AvatarLabelGroup size="md" initials={maker.initials} color={maker.color} name={name} supporting={supporting} />
      {follow ? (
        <div className="grid grid-cols-2 gap-4">
          {follow}
          {message}
        </div>
      ) : (
        <p className="text-sm leading-sm text-text-secondary">This is you. Other creators can follow you from here.</p>
      )}
      {why}
    </section>
  );
}

// ─────────────────────────── actions ───────────────────────────

export function AppreciateButton({
  counts,
  onToggle,
  size,
  className,
}: {
  counts: PostCounts;
  onToggle: () => void;
  size: "lg" | "xl";
  className?: string;
}) {
  const on = counts.appreciated;
  return (
    <Button
      type="button"
      hierarchy={on ? "secondary" : "primary"}
      size={size}
      aria-pressed={on}
      onClick={onToggle}
      iconLeading={<Icon icon={FavouriteIcon} size={16} strokeWidth={on ? 2.2 : 1.5} />}
      className={cn(on && "border-border-brand bg-bg-brand-subtle text-text-brand hover:bg-bg-brand-subtle", TAP, className)}
    >
      {on ? "Appreciated" : "Appreciate"}
      <span aria-hidden>·</span>
      <span className="tabular-nums">{formatCount(counts.appreciations)}</span>
    </Button>
  );
}

/** The counts under the actions: appreciations · views · comments (the last goes to the thread). */
export function CountsLine({ counts, className }: { counts: PostCounts; className?: string }) {
  return (
    <p className={cn("flex flex-wrap gap-x-7 gap-y-2 text-sm leading-sm text-text-secondary", className)}>
      <span>
        <span className="font-semibold tabular-nums text-text-primary">{formatCount(counts.appreciations)}</span>{" "}
        {counts.appreciations === 1 ? "appreciation" : "appreciations"}
      </span>
      <span>
        <span className="font-semibold tabular-nums text-text-primary">{formatCount(counts.views)}</span> {counts.views === 1 ? "view" : "views"}
      </span>
      {counts.comments !== null && (
        <a
          href="#comments"
          onClick={(e) => {
            e.preventDefault();
            scrollToComments();
          }}
          className="rounded-sm text-text-secondary underline-offset-2 outline-none hover:text-text-primary hover:underline focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <span className="font-semibold tabular-nums text-text-primary">{formatCount(counts.comments)}</span>{" "}
          {counts.comments === 1 ? "comment" : "comments"}
        </a>
      )}
    </p>
  );
}

/** Appreciate (the page's one primary), Save and Copy link for a visitor; Copy link for the maker. */
export function ActionsCard({
  owner,
  counts,
  actions,
  className,
}: {
  owner: boolean;
  counts: PostCounts;
  actions: PostActions;
  className?: string;
}) {
  return (
    <section aria-label="Actions" className={cn(CARD, "flex flex-col gap-7", className)}>
      {owner ? (
        <Button type="button" hierarchy="secondary" size="lg" onClick={actions.copyLink} iconLeading={<Icon icon={Link01Icon} size={16} />} className={TAP}>
          Copy link
        </Button>
      ) : (
        <div className="flex gap-4">
          <AppreciateButton counts={counts} onToggle={actions.toggleAppreciate} size="lg" className="flex-1" />
          <IconButton
            type="button"
            hierarchy="secondary"
            size="lg"
            aria-pressed={counts.saved}
            aria-label={counts.saved ? "Remove from saved" : "Save this post"}
            onClick={actions.toggleSave}
            icon={<Icon icon={counts.saved ? BookmarkCheck02Icon : Bookmark02Icon} size={20} />}
            className={cn("border-solid", counts.saved && "text-text-brand")}
          />
          <IconButton
            type="button"
            hierarchy="secondary"
            size="lg"
            aria-label="Copy link to this post"
            onClick={actions.copyLink}
            icon={<Icon icon={Link01Icon} size={20} />}
            className="border-solid"
          />
        </div>
      )}
      <CountsLine counts={counts} />
    </section>
  );
}

/** A phone's actions, in reach of a thumb: Appreciate n · Save · Comments n · Copy link. */
export function PostActionBar({ owner, counts, actions }: { owner: boolean; counts: PostCounts; actions: PostActions }) {
  const square =
    "inline-flex h-[48px] flex-1 items-center justify-center gap-3 rounded-lg border border-solid border-border bg-bg-surface text-md font-semibold text-text-primary outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none";
  // The bar covers main's foot: a control Tab reaches scrolls in above it.
  const barRef = useMainScrollPadding("bottom");
  return (
    <div
      ref={barRef}
      role="group"
      aria-label="Post actions"
      className="fixed inset-x-0 bottom-0 z-sticky flex gap-3 border-t border-solid border-border bg-bg-surface px-6 pb-6 pt-4 md:hidden [body:has(#comments_textarea:focus)_&]:hidden"
    >
      {owner ? (
        <span className="inline-flex h-[48px] flex-[1.4] items-center justify-center gap-3 text-md font-semibold text-text-secondary">
          <Icon icon={FavouriteIcon} size={18} />
          <span className="tabular-nums">{formatCount(counts.appreciations)}</span>
          <span aria-hidden>·</span>
          <span className="tabular-nums">{plural(counts.views, "view", "views")}</span>
        </span>
      ) : (
        <>
          <AppreciateButton counts={counts} onToggle={actions.toggleAppreciate} size="xl" className="h-[48px] flex-[1.4] px-4" />
          <button
            type="button"
            aria-pressed={counts.saved}
            aria-label={counts.saved ? "Remove from saved" : "Save this post"}
            onClick={actions.toggleSave}
            className={cn(square, counts.saved && "text-text-brand")}
          >
            <Icon icon={counts.saved ? BookmarkCheck02Icon : Bookmark02Icon} size={20} />
          </button>
        </>
      )}
      <button
        type="button"
        onClick={() => scrollToComments()}
        aria-label={counts.comments === null ? "Comments" : `Comments, ${counts.comments}`}
        className={square}
      >
        <Icon icon={Comment01Icon} size={20} />
        {counts.comments !== null && <span className="tabular-nums">{formatCount(counts.comments)}</span>}
      </button>
      <button type="button" onClick={actions.copyLink} aria-label="Copy link to this post" className={square}>
        <Icon icon={Link01Icon} size={20} />
      </button>
    </div>
  );
}

// ─────────────────────────── marketplace ───────────────────────────

/** What is for sale, and where it is bought (one home: the Marketplace page). */
export function MarketplaceCard({ post, className }: { post: InnovationPost; className?: string }) {
  const id = React.useId();
  const listing = post.listing;
  if (!listing) return null;
  return (
    <section aria-labelledby={id} className={cn(CARD, "flex flex-col gap-7", className)}>
      <h2 id={id} className="text-lg font-bold leading-lg text-text-primary">
        On Marketplace
      </h2>
      <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-4 text-md leading-md">
        {listing.rows.map((r) => (
          <React.Fragment key={`${r.label}:${r.price}`}>
            <dt className="text-text-secondary">{r.label}</dt>
            <dd className="text-right font-semibold tabular-nums text-text-primary">{r.price}</dd>
          </React.Fragment>
        ))}
      </dl>
      <Link href={listing.href} className={cn(buttonVariants({ hierarchy: "secondary", size: "lg" }), "w-full hover:text-[color:var(--color-button-secondary-text)]", TAP)}>
        View on Marketplace
        <Icon icon={ArrowRight01Icon} size={16} />
      </Link>
      <p className="text-sm leading-sm text-text-secondary">Buying and bids happen on the Marketplace page.</p>
    </section>
  );
}

// ─────────────────────────── about ───────────────────────────

/** Only the rows that have a value. */
export function aboutRowsOf(post: InnovationPost): { label: string; value: string }[] {
  const rows: { label: string; value: string | null }[] = [
    { label: "Category", value: post.category },
    { label: "Products", value: post.products.length > 0 ? String(post.products.length) : null },
    { label: "Parts", value: post.partsCount > 0 ? String(post.partsCount) : null },
    { label: "Network", value: post.network },
    { label: "Created", value: formatDate(post.createdAt) },
    { label: "Updated", value: formatDate(post.updatedAt) === formatDate(post.createdAt) ? null : formatDate(post.updatedAt) },
    { label: "License", value: post.license },
    { label: "Minted on", value: post.chain },
  ];
  return rows.filter((r): r is { label: string; value: string } => !!r.value);
}

/** About: a card in the rail; on a phone a row that opens (`collapsible`). */
export function AboutCard({ post, collapsible, className }: { post: InnovationPost; collapsible: boolean; className?: string }) {
  const [open, setOpen] = React.useState(false);
  const headingId = React.useId();
  const listId = React.useId();
  const rows = aboutRowsOf(post);
  if (rows.length === 0) return null;
  const summary = [post.category, post.network, post.license].filter(Boolean).join(" · ");
  const list = (
    <dl id={listId} className={cn("grid grid-cols-[auto_minmax(0,1fr)] gap-x-8 gap-y-4 text-md leading-md", collapsible && !open && "max-md:hidden", collapsible && "max-md:pb-7")}>
      {rows.map((r) => (
        <React.Fragment key={r.label}>
          <dt className="text-text-secondary">{r.label}</dt>
          <dd className="text-right font-semibold text-text-primary">{r.value}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
  return (
    <section
      aria-labelledby={headingId}
      className={cn(CARD, "flex flex-col gap-6", collapsible && "max-md:gap-0 max-md:rounded-none max-md:border-x-0 max-md:bg-transparent max-md:p-0", className)}
    >
      <h2 id={headingId} className={cn("text-lg font-bold leading-lg text-text-primary", collapsible && "max-md:hidden")}>
        About
      </h2>
      {collapsible && (
        <h2 className="md:hidden">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={listId}
            onClick={() => setOpen((v) => !v)}
            className="flex min-h-[48px] w-full items-center justify-between gap-6 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <span className="text-lg font-bold leading-lg text-text-primary">About</span>
            <span className="inline-flex min-w-0 items-center gap-3 text-sm leading-sm text-text-secondary">
              <span className="truncate">{summary}</span>
              <Icon icon={ArrowDown01Icon} size={16} className={cn("shrink-0 transition-transform duration-fast motion-reduce:transition-none", open && "rotate-180")} />
            </span>
          </button>
        </h2>
      )}
      {list}
    </section>
  );
}

// ─────────────────────────── more from the maker ───────────────────────────

/** Up to three other posts by the same maker. Absent when there are none. */
export function MoreFrom({ post, className }: { post: InnovationPost; className?: string }) {
  const id = React.useId();
  const others = React.useMemo(
    () => SAMPLE_POSTS.filter((p) => p.creator.id === post.creator.id && p.id !== post.id).slice(0, 3),
    [post.creator.id, post.id],
  );
  if (others.length === 0) return null;
  return (
    <section aria-labelledby={id} className={cn("flex flex-col gap-6", className)}>
      <h2 id={id} className="text-lg font-bold leading-lg text-text-primary">
        More from {firstName(post.creator.name)}
      </h2>
      <ul role="list" className="grid grid-cols-3 gap-4">
        {others.map((p) => {
          const image = p.media.find((m) => m.kind === "image");
          return (
            <li key={p.id} className="min-w-0">
              <Link
                href={postHref(p.slug)}
                className="group flex flex-col gap-3 rounded-lg text-sm font-semibold leading-sm text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-page"
              >
                <span className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-bg-surface-raised text-text-tertiary">
                  {image && image.kind === "image" ? (
                    <PostImg
                      src={image.src}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-normal ease-out group-hover:scale-105 motion-reduce:transition-none"
                      fallback={<ImageGone />}
                    />
                  ) : (
                    <Icon icon={CpuIcon} size={20} />
                  )}
                </span>
                <span className="line-clamp-2 group-hover:underline">{p.title}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

