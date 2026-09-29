"use client";

// The buyer rail's edition offers (Figma 41505:134786; spec §2.4, TABS T2,
// P2-TABS-26 "Done"): every listed Physical or Virtual NFT of the project,
// under its product, below the Main NFT's card in the same Marketplace block.
// A paused or removed Main listing hides them all (`editionsHiddenWith`).
//
// - A card per track: "{Kind} NFT · {Use}", "NFTs sold {s}/{t}" (or "Sold
//   out"), and the tier — Regular (this version only) or Extended (every
//   future version) — as a radiogroup with each price.
// - A demo buyer gets Buy now: quiet, full width, 44 px (the Main NFT's
//   Buy now keeps the page's one violet, C16). It opens the one purchase
//   request with the chosen tier (`useEditionPurchase`), which writes ONE
//   Sale for the next unit; the product's Customers tab reads it.
// - A preview reads the same offers with their prices and no button (PPL-6).

import * as React from "react";
import Link from "next/link";
import { Button, Radio, TestnetDemoBadge } from "@/components/ideeza";
import { RailFact, RailFacts } from "@/components/projects/details/rail-block";
import type { SlotProps } from "@/components/projects/details/slots";
import { can } from "@/lib/manual/permissions";
import { displayProductName } from "@/lib/manual/products-tab-view";
import { editionChainOf, editionOffersOf, KIND_WORD, TIER_HELP, trackCardOf, USE_WORD } from "@/lib/market/editions";
import type { EditionTrack, Listing } from "@/lib/market/types";
import { formatAmount } from "@/lib/wallet/money";
import type { DemoBuyerId } from "@/lib/wallet/types";
import { cn } from "@/lib/utils";
import { TIER_WORD, useEditionPurchase, type EditionTier } from "./purchase-dialog";

const TIERS: EditionTier[] = ["regular", "extended"];
const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
const LINK =
  "rounded-sm text-md font-semibold text-text-link underline-offset-2 outline-none hover:text-text-link-hover hover:underline focus-visible:ring-2 focus-visible:ring-border-focus";

type Listed = EditionTrack & { listing: NonNullable<EditionTrack["listing"]> };

export function EditionOffers({ project, view, viewer, announce }: Pick<SlotProps, "project" | "view" | "viewer" | "announce">) {
  const products = React.useMemo(
    () => view.products.map((p) => ({ id: p.id, name: displayProductName(p.name) })),
    [view.products],
  );
  const titleId = React.useId();
  const groups = editionOffersOf(products, view.editions, view.listing);
  const main: Listing | null = view.listing.kind === "none" ? null : view.listing.listing;
  const chain = editionChainOf(view.mint.record, main, null);
  if (!groups.length || !chain) return null;
  const buyerId = viewer.kind === "demo-buyer" ? viewer.buyerId : null;

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-6 border-t border-solid border-border pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id={titleId} className="m-0 text-md font-bold text-text-primary">
          Physical and Virtual NFTs
        </h3>
        <TestnetDemoBadge />
      </div>
      {groups.map((g) => (
        <div key={g.productId} className="flex flex-col gap-4">
          {buyerId ? (
            <Link href={`/marketplace/${project.id}/products/${g.productId}`} className={cn(LINK, "self-start break-words")}>
              {g.name}
            </Link>
          ) : (
            <h4 className="m-0 text-md font-semibold text-text-primary">{g.name}</h4>
          )}
          <ul role="list" className="m-0 flex list-none flex-col gap-4 p-0">
            {g.tracks.map((t) => (
              <li key={t.id}>
                {buyerId ? (
                  <BuyableOffer
                    project={project}
                    view={view}
                    viewer={viewer}
                    buyerId={buyerId}
                    track={t as Listed}
                    announce={announce}
                  />
                ) : (
                  <OfferFrame track={t as Listed} view={view}>
                    <RailFacts>
                      <RailFact label="Regular price">
                        <span className="tabular-nums">{formatAmount(t.listing!.regular, t.listing!.token)}</span>
                      </RailFact>
                      <RailFact label="Extended price">
                        <span className="tabular-nums">{formatAmount(t.listing!.extended, t.listing!.token)}</span>
                      </RailFact>
                    </RailFacts>
                  </OfferFrame>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function OfferFrame({ track, view, children }: { track: Listed; view: SlotProps["view"]; children: React.ReactNode }) {
  const card = trackCardOf(track, view.sales);
  return (
    <section
      aria-label={`${KIND_WORD[track.kind]} NFT · ${USE_WORD[track.use]}`}
      className="flex flex-col gap-5 rounded-lg border border-solid border-border p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-md font-semibold text-text-primary">{`${KIND_WORD[track.kind]} NFT · ${USE_WORD[track.use]}`}</span>
        <span className="text-sm tabular-nums text-text-secondary">{card.soldLine}</span>
      </div>
      {children}
    </section>
  );
}

function BuyableOffer({
  project,
  view,
  viewer,
  buyerId,
  track,
  announce,
}: {
  project: SlotProps["project"];
  view: SlotProps["view"];
  viewer: SlotProps["viewer"];
  buyerId: DemoBuyerId;
  track: Listed;
  announce: (m: string) => void;
}) {
  const { busyId, buy } = useEditionPurchase({ project, view, buyerId });
  const [tier, setTier] = React.useState<EditionTier>("regular");
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const labelId = React.useId();
  const card = trackCardOf(track, view.sales);
  // The track's own listing is live while this offer shows (it's hidden with a paused or removed Main).
  const canBuy = !card.soldOut && can(viewer, "listing.buy", { ...view.canCtx, listingLive: true });
  const busy = busyId === track.id;

  const pick = (i: number) => {
    setTier(TIERS[i]);
    refs.current[i]?.focus();
  };

  return (
    <OfferFrame track={track} view={view}>
      <div className="flex flex-col gap-2">
        <span id={labelId} className="text-sm font-medium text-text-secondary">
          Tier
        </span>
        <div role="radiogroup" aria-labelledby={labelId} className="flex flex-col gap-3">
          {TIERS.map((t, i) => {
            const on = tier === t;
            const price = t === "regular" ? track.listing.regular : track.listing.extended;
            return (
              <button
                key={t}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={on}
                tabIndex={on ? 0 : -1}
                onClick={() => setTier(t)}
                onKeyDown={(e) => {
                  if (["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].includes(e.key)) {
                    e.preventDefault();
                    pick((i + 1) % TIERS.length);
                  }
                }}
                className={cn(
                  "flex min-h-[40px] items-start gap-4 rounded-lg border border-solid px-5 py-4 text-left outline-none transition-colors duration-fast motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-border-focus",
                  TAP,
                  on ? "border-border-brand bg-bg-brand-subtle" : "border-border bg-bg-surface hover:bg-bg-subtle",
                )}
              >
                <Radio checked={on} decorative size="sm" className="mt-[2px]" />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-4">
                    <span className="text-sm font-semibold text-text-primary">{TIER_WORD[t]}</span>
                    <span className="text-sm font-semibold tabular-nums text-text-primary">
                      {formatAmount(price, track.listing.token)}
                    </span>
                  </span>
                  <span className="text-xs leading-relaxed text-text-secondary">{TIER_HELP[t]}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {canBuy ? (
        <Button
          type="button"
          hierarchy="secondary"
          size="lg"
          className="h-[44px] w-full"
          disabled={busy}
          onClick={async () => {
            const done = await buy(track, tier);
            if (done) announce(done);
          }}
        >
          {`Buy now · ${formatAmount(tier === "regular" ? track.listing.regular : track.listing.extended, track.listing.token)}`}
        </Button>
      ) : card.soldOut ? (
        <p className="m-0 text-sm text-text-secondary">All {card.total} are sold.</p>
      ) : null}
    </OfferFrame>
  );
}
