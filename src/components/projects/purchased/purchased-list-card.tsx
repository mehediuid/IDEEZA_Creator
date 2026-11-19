"use client";

// A project bought from, as a card among the maker's projects in My projects › All (owner, 2026-11-19: "All should
// have everything"). One grid reads as one list, so it is the list's own card (project-card.tsx) — the same frame,
// cover, title, line and hint, a row below a 560 px list — with what makes it a purchase in the card's own places:
// the chip says Purchased, the line who made it and when it was bought, the hint what is held, for sale and sold.
// Its one link opens the purchased page, or the project itself for a whole project bought. The Purchased tab keeps its
// own Asset Card (purchased-tab.tsx).

import * as React from "react";
import Link from "next/link";
import { ArrowRight02Icon, CpuIcon, ImageNotFound01Icon, ShoppingBag01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza";
import { formatDate, formatShortDate } from "@/lib/manual/project-summary";
import { purchaseHrefOf, type PurchasedProject } from "@/lib/market/purchases";

/** The hint on the card's floor: "You own 3 NFTs · 1 for sale · 1 sold". */
export function purchasedHintOf(p: Pick<PurchasedProject, "count" | "forSale" | "sold">): string {
  return [`You own ${p.count} ${p.count === 1 ? "NFT" : "NFTs"}`, p.forSale > 0 ? `${p.forSale} for sale` : null, p.sold.length > 0 ? `${p.sold.length} sold` : null]
    .filter(Boolean)
    .join(" · ");
}

export function PurchasedListCard({ p, now }: { p: PurchasedProject; now: number }) {
  const [imgOk, setImgOk] = React.useState(true);
  const chip = (
    // The status chip's own shape (status-chip.tsx), in the brand tone the Purchased badge has.
    <Badge tone="brand" icon={<Icon icon={ShoppingBag01Icon} size={12} />} className="h-[22px] items-center gap-[4px] px-[8px] py-0 text-sm font-semibold leading-none">
      Purchased
    </Badge>
  );
  return (
    <article className="relative flex h-full flex-col gap-[10px] overflow-hidden rounded-[12px] border border-solid border-border bg-bg-surface p-[10px] transition-colors duration-normal ease-decelerate hover:border-border-strong has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-border-focus has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-bg-page motion-reduce:transition-none [@container(min-width:560px)]:gap-0 [@container(min-width:560px)]:p-0">
      <div className="flex gap-[12px] [@container(min-width:560px)]:block">
        <div className="relative h-[60px] w-[96px] shrink-0 overflow-hidden rounded-[8px] bg-bg-surface-raised [@container(min-width:560px)]:aspect-[16/10] [@container(min-width:560px)]:h-auto [@container(min-width:560px)]:w-full [@container(min-width:560px)]:rounded-none">
          {p.cover && imgOk ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.cover} alt="" loading="lazy" decoding="async" onError={() => setImgOk(false)} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-[4px] text-text-tertiary">
              <Icon icon={p.cover ? ImageNotFound01Icon : CpuIcon} size={18} strokeWidth={1.4} />
              {p.cover && <span className="px-[6px] text-center text-sm leading-tight">Image didn&apos;t load</span>}
            </div>
          )}
          {/* Grid mode only: the chip floats over the cover. */}
          <span className="pointer-events-none absolute right-[10px] top-[10px] hidden [@container(min-width:560px)]:inline-flex">{chip}</span>
        </div>

        <div className="min-w-0 flex-1 [@container(min-width:560px)]:px-[14px] [@container(min-width:560px)]:pt-[12px]">
          <div className="flex flex-wrap items-start justify-between gap-[6px]">
            <h3 className="line-clamp-2 min-w-0 text-lg font-medium text-text-primary">
              {/* The card's one link: its ::after covers the whole <article>. */}
              <Link href={purchaseHrefOf(p)} title={p.name} className="outline-none after:absolute after:inset-0 hover:underline focus-visible:underline">
                {p.name}
              </Link>
            </h3>
            {/* Row mode only: the chip sits beside the title. */}
            <span className="flex shrink-0 items-center [@container(min-width:560px)]:hidden">{chip}</span>
          </div>
          <p className="mt-[4px] truncate text-md text-text-tertiary">
            By {p.creator} · {p.products.length === 1 ? "1 product" : `${p.products.length} products`} ·{" "}
            <time dateTime={new Date(p.lastAt).toISOString()} title={formatDate(p.lastAt)}>
              Bought {formatShortDate(p.lastAt, now)}
            </time>
          </p>
        </div>
      </div>

      {/* The hint: text, not a control, on the card's floor so a row's hints line up. */}
      <p className="mt-auto flex min-w-0 items-center gap-[6px] text-md font-medium text-text-secondary [@container(max-width:559px)]:pl-[108px] [@container(min-width:560px)]:px-[14px] [@container(min-width:560px)]:pb-[14px] [@container(min-width:560px)]:pt-[12px]">
        <span className="truncate">{purchasedHintOf(p)}</span>
        <Icon icon={ArrowRight02Icon} size={14} className="shrink-0" />
      </p>
    </article>
  );
}
