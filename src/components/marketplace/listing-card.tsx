"use client";

// One Explore marketplace card (P2-MARKETPLACE-6, -19), in the My projects
// card's shell (project-card.tsx): a 16:10 cover from a 560 px list, a 96×60
// thumbnail row below that, one DOM tree repainted by the list's container
// query. Top to bottom: the cover (with the same fallbacks), the type chip —
// over the cover in grid mode, beside the title in row mode — the title, the
// meta line and the price block.
//
// The title is the card's only control: a link to the buyer view with a
// stretched hit area. Every card leads to one place, so a second control would
// repeat the link. Its words — the price block — are `listingCardText`'s
// (market-list.ts); the chip reads the item's own facts.

import * as React from "react";
import Link from "next/link";
import { CpuIcon, ImageNotFound01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, type BadgeTone } from "@/components/ideeza";
import { timeLeftLabel } from "@/lib/market/auction";
import { listingCardText, type MarketItem, type MarketQuery } from "@/lib/market/market-list";

const CHIP = "h-[22px] items-center gap-[4px] px-[8px] py-0 text-sm font-semibold leading-none";

/** The chip's word and tone: never colour alone — every tone carries its word. */
function chipOf(item: MarketItem, tab: MarketQuery["tab"]): { word: string; tone: BadgeTone } {
  if (tab === "purchased") return { word: "Purchased", tone: "success" };
  if (item.status === "sold") return { word: "Sold", tone: "success" };
  if (item.status === "ended") return { word: "Auction ended", tone: "neutral" };
  if (item.listing.type === "auction" && item.auction) {
    return {
      word: `Auction · ${timeLeftLabel(item.auction.msLeft)}`,
      tone: item.auction.phase === "endingSoon" ? "warning" : "neutral",
    };
  }
  return { word: "Buy now", tone: "neutral" };
}

function productsLabel(n: number): string {
  return n === 1 ? "1 product" : `${n} products`;
}

export function ListingCard({
  item,
  tab,
  now,
  heldPct,
}: {
  item: MarketItem;
  tab: MarketQuery["tab"];
  /** The page's minute clock. */
  now: number;
  /** For sale only: the share the active buyer already holds of this project, or null. */
  heldPct: number | null;
}) {
  const [imgOk, setImgOk] = React.useState(true);
  const hasCover = Boolean(item.cover);
  const text = listingCardText(item, now, tab);
  const chip = chipOf(item, tab);
  const chipEl = (
    <Badge tone={chip.tone} className={CHIP}>
      {chip.word}
    </Badge>
  );

  return (
    <article className="relative flex h-full flex-col gap-[10px] overflow-hidden rounded-[12px] border border-border bg-bg-surface p-[10px] [@container(min-width:560px)]:gap-0 [@container(min-width:560px)]:p-0">
      <div className="flex gap-[12px] [@container(min-width:560px)]:block">
        <div className="relative h-[60px] w-[96px] shrink-0 overflow-hidden rounded-[8px] bg-bg-surface-raised [@container(min-width:560px)]:aspect-[16/10] [@container(min-width:560px)]:h-auto [@container(min-width:560px)]:w-full [@container(min-width:560px)]:rounded-none">
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
              <Icon icon={hasCover ? ImageNotFound01Icon : CpuIcon} size={18} strokeWidth={1.4} />
              {hasCover && <span className="px-[6px] text-center text-2xs leading-2xs">Image didn&apos;t load</span>}
            </div>
          )}
          {/* Grid mode: the chip floats over the cover. */}
          <span className="pointer-events-none absolute right-[10px] top-[10px] hidden [@container(min-width:560px)]:inline-flex">
            {chipEl}
          </span>
        </div>

        <div className="min-w-0 flex-1 [@container(min-width:560px)]:px-[14px] [@container(min-width:560px)]:pb-[14px] [@container(min-width:560px)]:pt-[12px]">
          <div className="flex flex-wrap items-start justify-between gap-[6px]">
            <h3 className="line-clamp-2 min-w-0 text-lg font-medium text-text-primary">
              <Link
                href={`/marketplace/${item.projectId}`}
                title={item.name}
                className="rounded-sm outline-none after:absolute after:inset-0 after:rounded-[12px] hover:underline focus-visible:underline focus-visible:after:ring-2 focus-visible:after:ring-border-focus"
              >
                {item.name}
              </Link>
            </h3>
            {/* Row mode: the chip sits beside the title. */}
            <span className="flex shrink-0 items-center [@container(min-width:560px)]:hidden">{chipEl}</span>
          </div>
          <p className="mt-[4px] truncate text-md text-text-tertiary">By you · {productsLabel(item.productCount)}</p>
          <p className="mt-[8px] text-lg font-semibold tabular-nums text-text-primary">{text.price}</p>
          {text.sub && <p className="mt-[2px] text-md tabular-nums text-text-secondary">{text.sub}</p>}
          {tab === "forSale" && heldPct !== null && heldPct > 0 && (
            <p className="mt-[8px]">
              <Badge tone="info" className={CHIP}>
                You own {heldPct}%
              </Badge>
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

/** Loading (P2-MARKETPLACE-7): the My projects skeleton's shape, with a price bar in place of the button.
 *  Still under reduced motion (`motion-safe:animate-pulse`). */
export function ListingCardSkeleton() {
  return (
    <div
      aria-hidden
      className="flex flex-col gap-[10px] overflow-hidden rounded-[12px] border border-border bg-bg-surface p-[14px]"
    >
      <div className="aspect-[16/10] rounded-[8px] bg-bg-surface-raised motion-safe:animate-pulse" />
      <div className="h-[16px] w-3/4 rounded bg-bg-surface-raised motion-safe:animate-pulse" />
      <div className="h-[13px] w-1/2 rounded bg-bg-surface-raised motion-safe:animate-pulse" />
      <div className="h-[20px] w-2/5 rounded bg-bg-surface-raised motion-safe:animate-pulse" />
      <div className="h-[13px] w-2/3 rounded bg-bg-surface-raised motion-safe:animate-pulse" />
    </div>
  );
}
