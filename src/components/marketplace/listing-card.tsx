"use client";

// One Explore marketplace card (P2-MARKETPLACE-6, -19) — the design system's
// Asset Card, M25 (owner, 2026-11-16: "the card's information isn't right;
// the design system has its cut"). Top to bottom, as M25 draws it:
// - Media: the cover in a 16 px-rounded frame inside the card's 12 px edge,
//   the status badge on it, top right, in dark glass with white words in
//   either theme ("Buy now", "Auction · 2h left", "Copies", "Sold",
//   "Purchased");
// - the title (Heading/H4), then the creator (Body/MD) with the stats beside
//   it, views and appreciations in Code/MD — only where they are real (an
//   Innovations sample, or a project shared there); M25's plays count is left
//   out: nothing counts plays;
// - the NFT tags (A18 Tag, Caption/MD): Main NFT, Physical NFT, Virtual NFT,
//   only what is on sale, the one the price is for lit (Selected);
// - a hairline, then the price block: its label, the amount (Heading/H4) and
//   the token apart (Code/MD), and beside it what M25's End block holds — an
//   auction's end, the buyer, a share. They sit at the card's foot, so a row
//   of cards lines its prices up;
// - on hover the picture gives up 60 px to M25's action button ("View
//   details", "View auction"). It is a picture of a button: the title link
//   covers the card, so the card has one control and one Tab stop.
// The facts are `listingCardFacts`'s (market-list.ts).

import * as React from "react";
import Link from "next/link";
import { CpuIcon, FavouriteIcon, ImageNotFound01Icon, ViewIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Tag, buttonVariants } from "@/components/ideeza";
import { formatCount } from "@/lib/feed";
import { listingCardFacts, type MarketItem, type MarketQuery } from "@/lib/market/market-list";
import { cn } from "@/lib/utils";

/** M25's media is 372 × 233 at a 372 px content width; on hover it is 60 px shorter (16 gap + the 44 px button). */
const MEDIA = "h-[62.63cqw] [@media(hover:hover)]:group-hover:h-[calc(62.63cqw-60px)]";

export type CardStats = { views: number; appreciations: number };

export function ListingCard({
  item,
  tab,
  now,
  heldPct,
  creator,
  stats,
}: {
  item: MarketItem;
  tab: MarketQuery["tab"];
  /** The page's minute clock. */
  now: number;
  /** For sale only: the share the active buyer already holds of this project, or null. */
  heldPct: number | null;
  /** Who made it: a sample's creator, else this browser's creator by name. */
  creator: string;
  /** Its Innovations counts, when it has them. */
  stats: CardStats | null;
}) {
  const [imgOk, setImgOk] = React.useState(true);
  const hasCover = Boolean(item.cover);
  const f = listingCardFacts(item, now, tab, heldPct);

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col gap-[20px] rounded-[var(--radius-2xl)] border border-solid bg-bg-surface px-[12px] pb-[20px] pt-[12px] [container-type:inline-size]",
        // M25's border is the card-glow paint style; its hover is the brand lilac.
        "border-[color-mix(in_srgb,var(--color-violet-200)_20%,transparent)] transition-colors duration-fast motion-reduce:transition-none [@media(hover:hover)]:hover:border-[color:var(--color-violet-300)]",
      )}
    >
      <div
        className={cn(
          "relative w-full shrink-0 overflow-hidden rounded-[var(--radius-2xl)] bg-bg-surface-raised transition-[height] duration-normal ease-out motion-reduce:transition-none",
          MEDIA,
        )}
      >
        {hasCover && imgOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.cover!}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setImgOk(false)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-[4px] text-text-tertiary">
            <Icon icon={hasCover ? ImageNotFound01Icon : CpuIcon} size={20} strokeWidth={1.4} />
            {hasCover && <span className="px-[6px] text-center text-sm leading-xs">Image didn&apos;t load</span>}
          </div>
        )}
        {/* M25's status badge: dark glass and white words over any picture, in either theme. */}
        <span className="pointer-events-none absolute right-[12px] top-[12px] inline-flex h-[30px] items-center rounded-[var(--radius-2xl)] bg-[color-mix(in_srgb,var(--color-bg-overlay)_32%,transparent)] px-[12px] text-md font-medium leading-md text-[color:var(--color-white)] backdrop-blur-[40px]">
          {f.badge}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col px-[8px]">
        <div className="flex flex-col gap-[16px]">
          <div className="flex flex-col gap-[8px]">
            <h3 className="truncate text-2xl font-semibold leading-2xl text-text-primary">
              <Link
                href={`/marketplace/${item.projectId}`}
                title={item.name}
                // The reset colours every a:hover as a link; M25's title stays the title's ink.
                className="rounded-sm outline-none after:absolute after:inset-0 after:rounded-[var(--radius-2xl)] hover:text-[color:var(--color-text-primary)] focus-visible:after:ring-2 focus-visible:after:ring-border-focus"
              >
                {item.name}
              </Link>
            </h3>
            <div className="flex min-w-0 items-center justify-between gap-[12px]">
              <p className="m-0 min-w-0 truncate text-lg leading-lg text-text-secondary">{creator}</p>
              {stats && (
                <p className="m-0 flex shrink-0 items-center gap-[16px] font-mono text-md leading-md text-text-secondary">
                  <span className="inline-flex items-center gap-[6px]">
                    <Icon icon={ViewIcon} size={16} />
                    <span className="sr-only">Views </span>
                    {formatCount(stats.views)}
                  </span>
                  <span className="inline-flex items-center gap-[6px]">
                    <Icon icon={FavouriteIcon} size={16} />
                    <span className="sr-only">Appreciations </span>
                    {formatCount(stats.appreciations)}
                  </span>
                </p>
              )}
            </div>
          </div>
          <ul role="list" aria-label="On sale" className="m-0 flex list-none flex-wrap gap-[8px] p-0">
            {f.tags.map((t) => (
              <li key={t.kind}>
                <Tag size="md" selected={t.on}>
                  {t.label}
                </Tag>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto flex flex-col gap-[8px] pt-[12px]">
          <div aria-hidden className="h-px w-full bg-border opacity-40" />
          <div className="flex items-end justify-between gap-[12px]">
            <div className="flex min-w-0 flex-col">
              <span className="text-lg leading-lg text-text-tertiary">{f.price.label}</span>
              <span className="flex items-end gap-[4px]">
                <span className="text-2xl font-semibold leading-2xl tabular-nums text-text-primary">{f.price.amount}</span>
                {f.price.token && <span className="font-mono text-md leading-md text-text-secondary">{f.price.token}</span>}
              </span>
            </div>
            {f.side && (
              <div className="flex min-w-0 flex-col items-end text-right">
                <span className="text-lg leading-lg text-text-tertiary">{f.side.label}</span>
                <span className="truncate font-mono text-md leading-md text-text-primary">{f.side.value}</span>
              </div>
            )}
          </div>
          {/* M25 Hover: the action button. A picture of one — the title link already covers the card. */}
          <span
            aria-hidden
            className={cn(buttonVariants({ hierarchy: "primary", size: "lg" }), "mt-[8px] hidden h-[44px] w-full [@media(hover:hover)]:group-hover:inline-flex")}
          >
            {f.action}
          </span>
        </div>
      </div>
    </article>
  );
}

/** Loading (P2-MARKETPLACE-7): M25's shape. Still under reduced motion (`motion-safe:animate-pulse`). */
export function ListingCardSkeleton() {
  return (
    <div
      aria-hidden
      className="flex flex-col gap-[20px] rounded-[var(--radius-2xl)] border border-solid border-border bg-bg-surface px-[12px] pb-[20px] pt-[12px]"
    >
      <div className="aspect-[372/233] rounded-[var(--radius-2xl)] bg-bg-surface-raised motion-safe:animate-pulse" />
      <div className="flex flex-col gap-[12px] px-[8px]">
        <div className="h-[20px] w-3/4 rounded bg-bg-surface-raised motion-safe:animate-pulse" />
        <div className="h-[16px] w-1/2 rounded bg-bg-surface-raised motion-safe:animate-pulse" />
        <div className="h-[28px] w-2/3 rounded-full bg-bg-surface-raised motion-safe:animate-pulse" />
        <div className="h-[44px] w-2/5 rounded bg-bg-surface-raised motion-safe:animate-pulse" />
      </div>
    </div>
  );
}
