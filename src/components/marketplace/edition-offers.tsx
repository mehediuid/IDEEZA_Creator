"use client";

// The buyer rail's edition offers (Figma 41505:134786; spec §2.4, TABS T2,
// P2-TABS-26 "Done"): every listed Physical or Virtual NFT, the whole
// project's copies first ("Whole project"), then each product's, below the
// Main NFT's card in the same Marketplace block — or alone, when the Main NFT
// was never listed: copies sell on their own (owner, 2026-10-11). Only the
// lock hides them: once the project is sold in full, its NFTs aren't for sale
// (R1-2).
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
import { editionChainOf, editionOffersOf, isProjectScope, TIER_HELP, trackCardOf } from "@/lib/market/editions";
import { KIND_LABEL, USE_LABEL } from "@/lib/market/sell-flow";
import { PROJECT_SCOPE, type EditionTrack, type Listing } from "@/lib/market/types";
import { formatAmount } from "@/lib/wallet/money";
import type { DemoBuyerId } from "@/lib/wallet/types";
import { cn } from "@/lib/utils";
import { TIER_WORD, useEditionPurchase, type EditionTier } from "./purchase-dialog";
import { ActivityNow } from "@/components/projects/details/activity/now-block";
import { formatDate } from "@/lib/manual/project-summary";

const TIERS: EditionTier[] = ["regular", "extended"];
const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
const LINK =
  "inline-flex items-center rounded-sm text-md font-semibold text-text-link underline-offset-2 outline-none hover:text-text-link-hover hover:underline focus-visible:ring-2 focus-visible:ring-border-focus";

type Listed = EditionTrack & { listing: NonNullable<EditionTrack["listing"]> };

export function EditionOffers({
  project,
  view,
  viewer,
  announce,
  alone = false,
}: Pick<SlotProps, "project" | "view" | "viewer" | "announce"> & {
  /** No Main NFT card above it: no rule between them. */
  alone?: boolean;
}) {
  const scopes = React.useMemo(
    () => [{ id: PROJECT_SCOPE, name: project.name }, ...view.products.map((p) => ({ id: p.id, name: displayProductName(p.name) }))],
    [project.name, view.products],
  );
  const titleId = React.useId();
  const groups = editionOffersOf(scopes, view.editions, view.lock !== null);
  const main: Listing | null = view.listing.kind === "none" ? null : view.listing.listing;
  const chain = editionChainOf(view.mint.record, main, null);
  if (!groups.length || !chain) return null;
  const buyerId = viewer.kind === "demo-buyer" ? viewer.buyerId : null;

  return (
    <section aria-labelledby={titleId} className={cn("flex flex-col gap-6", !alone && "border-t border-solid border-border pt-8")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id={titleId} className="m-0 text-md font-bold text-text-primary">
          Physical and Virtual NFTs
        </h3>
        <TestnetDemoBadge />
      </div>
      {groups.map((g) => (
        <div key={g.productId} className="flex flex-col gap-4">
          {isProjectScope(g.productId) ? (
            <h4 className="m-0 flex flex-col gap-1 text-md font-semibold text-text-primary">
              <span className="text-sm font-medium text-text-secondary">Whole project</span>
              <span className="break-words">{g.name}</span>
            </h4>
          ) : buyerId ? (
            <Link href={`/marketplace/${project.id}/products/${g.productId}`} className={cn(LINK, TAP, "self-start break-words")}>
              {g.name}
            </Link>
          ) : (
            <h4 className="m-0 text-md font-semibold text-text-primary">{g.name}</h4>
          )}
          <ul role="list" className="m-0 flex list-none flex-col gap-4 p-0">
            {g.tracks.map((t, i) => {
              // One activity block per (scope, kind), above that kind's first card (spec §7.2):
              // Personal and Business share the target. `g.productId` is PROJECT_SCOPE or a product id.
              const target = { kind: t.kind, scope: g.productId } as const;
              const first = i === 0 || g.tracks[i - 1].kind !== t.kind;
              const kind = t.kind === "physical" ? "Physical" : "Virtual";
              const of = isProjectScope(g.productId) ? "the whole project" : g.name;
              const listedAt = Math.min(...g.tracks.filter((x) => x.kind === t.kind).map((x) => x.listing?.listedAt ?? Infinity));
              return (
                <React.Fragment key={t.id}>
                  {first && (
                    <li>
                      <ActivityNow
                        variant="line"
                        projectId={project.id}
                        target={target}
                        label={`${kind} copies`}
                        heading={`${kind} copies of ${of} · Activity`}
                        emptyNote={Number.isFinite(listedAt) ? `No activity yet · listed ${formatDate(listedAt)}` : "No activity yet"}
                      />
                    </li>
                  )}
                  <li>
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
                          <RailFact label="Price">
                            <span className="tabular-nums">{formatAmount(t.listing!.regular, t.listing!.token)}</span>
                          </RailFact>
                          {t.listing!.extended !== t.listing!.regular && (
                            <RailFact label="With future updates">
                              <span className="tabular-nums">{formatAmount(t.listing!.extended, t.listing!.token)}</span>
                            </RailFact>
                          )}
                        </RailFacts>
                      </OfferFrame>
                    )}
                  </li>
                </React.Fragment>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}

/** "Virtual NFT · Personal use" and "3 of 10 sold": the plain words the owner's Sell tab uses. */
function OfferFrame({ track, view, children }: { track: Listed; view: SlotProps["view"]; children: React.ReactNode }) {
  const card = trackCardOf(track, view.sales);
  const name = `${KIND_LABEL[track.kind]} · ${USE_LABEL[track.use]}`;
  return (
    <section
      aria-label={name}
      className="flex flex-col gap-5 rounded-lg border border-solid border-border p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-md font-semibold text-text-primary">{name}</span>
        <span className="text-sm tabular-nums text-text-secondary">{card.soldOut ? "Sold out" : `${card.sold} of ${card.total} sold`}</span>
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
  // The track's own listing is live while this offer shows (only the lock hides it).
  const canBuy = !card.soldOut && can(viewer, "listing.buy", { ...view.canCtx, listingLive: true });
  const busy = busyId === track.id;
  // One price when "with future updates" costs the same: no choice to make.
  const oneTier = track.listing.extended === track.listing.regular;

  const pick = (i: number) => {
    setTier(TIERS[i]);
    refs.current[i]?.focus();
  };

  return (
    <OfferFrame track={track} view={view}>
      {oneTier ? (
        <p className="m-0 text-md leading-relaxed text-text-secondary">Includes every future version of this design.</p>
      ) : (
      <div className="flex flex-col gap-2">
        <span id={labelId} className="text-sm font-medium text-text-secondary">
          Choose
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
                    <span className="text-md font-semibold text-text-primary">{TIER_WORD[t]}</span>
                    <span className="text-md font-semibold tabular-nums text-text-primary">
                      {formatAmount(price, track.listing.token)}
                    </span>
                  </span>
                  <span className="text-md leading-relaxed text-text-secondary">{TIER_HELP[t]}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      )}
      {canBuy ? (
        <Button
          type="button"
          hierarchy="secondary"
          size="lg"
          className="h-[44px] w-full"
          // Not `disabled`, which would drop focus before the wallet dialog reads its opener.
          aria-disabled={busy || undefined}
          onClick={async (e) => {
            if (busy) return;
            // Safari doesn't focus a clicked button.
            e.currentTarget.focus();
            const done = await buy(track, oneTier ? "extended" : tier);
            if (done) announce(done);
          }}
        >
          {`Buy now · ${formatAmount(tier === "regular" ? track.listing.regular : track.listing.extended, track.listing.token)}`}
        </Button>
      ) : card.soldOut ? (
        <p className="m-0 text-md text-text-secondary">All {card.total} are sold.</p>
      ) : null}
    </OfferFrame>
  );
}
