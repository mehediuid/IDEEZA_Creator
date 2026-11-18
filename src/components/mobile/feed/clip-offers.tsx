"use client";

// What the clip's item is on the marketplace for, as one slim pill under the
// clip's text (owner 2026-11-12: the offer cards — up to three swiping glass
// cards with a Testnet pill, a full-width button and dots — covered half the
// video). The pill is the shop anchor short-video apps use: a brand disc with
// a bag, the first offer in the marketplace's words ("Main NFT · 0.8 ETH";
// an auction: "Current bid 0.3 ETH" and the time left, counting down), "+2"
// when there are more, and a chevron. It sizes to its words, so the video
// stays visible beside it. A tap opens the item's marketplace, where every
// offer, the Testnet demo note, buying and bidding live (one home). A project
// leads with its Main NFT, a product with its Physical NFT.

import * as React from "react";
import { ArrowRight01Icon, ShoppingBag01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { OFFER_NAME, type ClipOffer } from "@/lib/innovations/clips";
import { cn } from "@/lib/utils";
import { MEDIA_INK } from "../kit/media";
import { T } from "../type";

const two = (n: number) => String(n).padStart(2, "0");

/** "06:02:58" (hours may pass 24), or "Ended". */
export function countdown(ms: number): string {
  if (ms <= 0) return "Ended";
  const s = Math.floor(ms / 1000);
  return `${two(Math.floor(s / 3600))}:${two(Math.floor(s / 60) % 60)}:${two(s % 60)}`;
}

function subscribeSecond(onChange: () => void) {
  const id = window.setInterval(onChange, 1000);
  return () => window.clearInterval(id);
}
const secondNow = () => Math.floor(Date.now() / 1000) * 1000;

/** The time an auction has left, ticking each second while it is on screen. */
function TimeLeft({ endsAt }: { endsAt: number }) {
  const now = React.useSyncExternalStore(subscribeSecond, secondNow, () => 0);
  if (!now) return null;
  return <span className="tabular-nums text-text-warning">({countdown(endsAt - now)})</span>;
}

/** The pill's words for an offer: what it is, and its price (an auction: its bid). */
function wordsOf(o: ClipOffer): { name: string; price: string } {
  if (o.kind === "main" && o.auction) return { name: OFFER_NAME.main, price: `${o.auction.bidLabel} ${o.auction.bid}` };
  return { name: OFFER_NAME[o.kind], price: o.price };
}

export function ClipOffers({ offers, onBuy }: { offers: readonly ClipOffer[]; onBuy: (o: ClipOffer) => void }) {
  if (!offers.length) return null;
  const first = offers[0];
  const { name, price } = wordsOf(first);
  const more = offers.length - 1;
  return (
    <button
      type="button"
      onClick={() => onBuy(first)}
      aria-label={`On the marketplace: ${name}, ${price}${more ? `, and ${more} more` : ""}. Open the marketplace`}
      className="inline-flex h-[36px] max-w-full items-center gap-3 self-start rounded-full bg-[var(--color-modal-scrim)] py-1 pl-1 pr-4 outline-none backdrop-blur-sm transition-transform duration-fast active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      <span aria-hidden className="inline-flex size-[28px] shrink-0 items-center justify-center rounded-full bg-bg-brand text-[color:var(--color-white)]">
        <Icon icon={ShoppingBag01Icon} size={16} />
      </span>
      <span aria-hidden className={cn(T.meta, MEDIA_INK, "min-w-0 truncate")}>
        {name} · <span className="font-semibold tabular-nums">{price}</span>
        {first.auction?.endsAt ? (
          <>
            {" "}
            <TimeLeft endsAt={first.auction.endsAt} />
          </>
        ) : null}
      </span>
      {more > 0 && (
        <span aria-hidden className={cn(T.micro, MEDIA_INK, "shrink-0 rounded-full bg-[var(--color-glass-border-strong)] px-2 tabular-nums")}>
          +{more}
        </span>
      )}
      <span aria-hidden className={cn(MEDIA_INK, "shrink-0")}>
        <Icon icon={ArrowRight01Icon} size={16} />
      </span>
    </button>
  );
}
