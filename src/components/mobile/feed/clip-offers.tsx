"use client";

// Feed · "NFT Sell" (states 2–6): what the clip's item is offered at, one card
// at a time across the clip's text column, with the dots under it. A card is
// the glass card (color/glass/shadow, radius/md, 12 padding, 8 apart): the NFT
// (Label/MD) with "Selling n%" when the listing says, its price or its use
// (Body/XS) on a line of its own so nothing is cut at 320, a Caption/SM line
// (sold count, or the listing type — an auction adds the time left, counting
// down), the Testnet demo pill on the first, and an A01 Primary SM button that
// opens the item's marketplace, where buying and bidding happen (one home).
// An auction reads in the marketplace's words: Current bid / Starting bid and
// Place bid (the Figma's Max bid and Make an offer). A project starts at its
// Main NFT; a product at its Physical NFT.

import * as React from "react";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { OFFER_NAME, offerActionLabel, type ClipOffer } from "@/lib/innovations/clips";
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

function linesOf(o: ClipOffer): { aside: string | null; caption: string | null } {
  if (o.kind === "main") {
    if (o.auction) return { aside: `${o.auction.bidLabel}: ${o.auction.bid}`, caption: "Listing type: Auction" };
    return { aside: `Price: ${o.price}`, caption: "Listing type: Buy now" };
  }
  return { aside: o.use, caption: o.sold ? `NFT sold: ${o.sold.count}/${o.sold.of}` : null };
}

export function ClipOffers({ offers, onBuy }: { offers: readonly ClipOffer[]; onBuy: (o: ClipOffer) => void }) {
  const track = React.useRef<HTMLDivElement>(null);
  const [at, setAt] = React.useState(0);
  if (!offers.length) return null;

  const go = (i: number) => {
    const el = track.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div
        ref={track}
        aria-label="On the marketplace"
        role="group"
        onScroll={(e) => {
          const el = e.currentTarget;
          setAt(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
        }}
        className="flex w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {offers.map((o, i) => {
          const { aside, caption } = linesOf(o);
          return (
            <div key={`${o.kind}-${i}`} className="w-full shrink-0 snap-start">
              <div className="flex flex-col gap-4 rounded-md bg-[var(--color-glass-shadow)] p-6">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className={cn(T.label, MEDIA_INK, "whitespace-nowrap")}>{OFFER_NAME[o.kind]}</span>
                    {o.sharePct ? <Badge tone="brand-solid">Selling {o.sharePct}%</Badge> : null}
                    {i === 0 && <TestnetDemoBadge className="ml-auto shrink-0" />}
                  </div>
                  {aside && <p className={cn(T.meta, MEDIA_INK)}>{aside}</p>}
                  {caption && (
                    <p className={cn(T.micro, MEDIA_INK)}>
                      {caption} {o.auction?.endsAt ? <TimeLeft endsAt={o.auction.endsAt} /> : null}
                    </p>
                  )}
                </div>
                <Button size="sm" className="w-full" onClick={() => onBuy(o)}>
                  {offerActionLabel(o)}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      {offers.length > 1 && (
        <div className="flex items-center gap-2">
          {offers.map((o, i) => (
            <button
              key={`${o.kind}-${i}`}
              type="button"
              aria-label={`${OFFER_NAME[o.kind]}, ${i + 1} of ${offers.length}`}
              aria-current={i === at ? "true" : undefined}
              onClick={() => go(i)}
              // A 16 px dot slot with a 44 px tall touch area around it (the dots don't grow).
              className="relative flex size-[16px] items-center justify-center rounded-full outline-none after:absolute after:inset-x-0 after:-inset-y-[14px] after:content-[''] focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              <span className={cn("size-[8px] rounded-full bg-[var(--color-white)]", i !== at && "opacity-40")} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
