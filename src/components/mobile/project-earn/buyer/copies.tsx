"use client";

// 18h · Copies on sale: the project's listed Physical and Virtual NFTs under
// the Main NFT (the web's edition-offers.tsx on a phone) — the whole
// project's first ("Whole project"), then each product's; one card per copy:
// "Virtual NFT · Personal use" and "0 of 100 sold", This version / With
// future updates with their prices, the copy's activity line, and Buy now ·
// price (quiet; the Main NFT's Buy now keeps the one violet). Buying is the
// web's `useEditionPurchase` through the phone's wallet sheet, in the owner's
// licence words. A preview reads the prices with no button. Only the lock
// (sold in full) hides them.

import * as React from "react";
import { Button } from "@/components/ideeza/button";
import { Radio } from "@/components/ideeza/checkbox";
import { TIER_WORD, useEditionPurchase, type EditionTier } from "@/components/marketplace/purchase-dialog";
import { useWalletRequest, WalletRequestScope, type WalletRequestApi } from "@/components/wallet/wallet-provider";
import { historyOf, labelOf } from "@/lib/manual/journey";
import { useJourney } from "@/lib/manual/journey-store";
import { can, type Viewer } from "@/lib/manual/permissions";
import { displayProductName } from "@/lib/manual/products-tab-view";
import type { ProjectView } from "@/lib/manual/project-read";
import { formatDate } from "@/lib/manual/project-summary";
import type { ManualProject } from "@/lib/manual/projects";
import { editionChainOf, editionOffersOf, isProjectScope, TIER_HELP, trackCardOf } from "@/lib/market/editions";
import { plainUseWords, withUseWords } from "@/lib/market/phone-sell";
import { KIND_LABEL, USE_LABEL } from "@/lib/market/sell-flow";
import { PROJECT_SCOPE, type EditionTrack, type Listing, type Sale } from "@/lib/market/types";
import { buyerLabel } from "@/lib/wallet/identities";
import { formatAmount } from "@/lib/wallet/money";
import type { DemoBuyerId } from "@/lib/wallet/types";
import { cn } from "@/lib/utils";
import { LIST_CARD } from "../../kit/list";
import { T } from "../../type";

const TIERS: EditionTier[] = ["regular", "extended"];
type Listed = EditionTrack & { listing: NonNullable<EditionTrack["listing"]> };

/** The wallet requests under it in the owner's licence words (Personal use / Business use). */
function UseWordsScope({ children }: { children: React.ReactNode }) {
  const api = useWalletRequest();
  const scoped = React.useMemo<WalletRequestApi>(() => ({ ...api, request: (req, opts) => api.request(withUseWords(req), opts) }), [api]);
  return <WalletRequestScope api={scoped}>{children}</WalletRequestScope>;
}

export function PhoneCopies(props: {
  project: ManualProject;
  view: ProjectView;
  viewer: Viewer;
  /** The active demo buyer; null in a preview. */
  buyerId: DemoBuyerId | null;
  /** The purchase's sentence, once the wallet sheet confirmed it. */
  onBought: (sentence: string, track: EditionTrack) => void;
  anchorRef?: React.Ref<HTMLElement>;
}) {
  return (
    <UseWordsScope>
      <Copies {...props} />
    </UseWordsScope>
  );
}

function Copies({
  project,
  view,
  viewer,
  buyerId,
  onBought,
  anchorRef,
}: {
  project: ManualProject;
  view: ProjectView;
  viewer: Viewer;
  buyerId: DemoBuyerId | null;
  onBought: (sentence: string, track: EditionTrack) => void;
  anchorRef?: React.Ref<HTMLElement>;
}) {
  const scopes = React.useMemo(
    () => [{ id: PROJECT_SCOPE, name: project.name }, ...view.products.map((p) => ({ id: p.id, name: displayProductName(p.name) }))],
    [project.name, view.products],
  );
  const groups = editionOffersOf(scopes, view.editions, view.lock !== null);
  const main: Listing | null = view.listing.kind === "none" ? null : view.listing.listing;
  const chain = editionChainOf(view.mint.record, main, null);
  if (!groups.length || !chain) return null;
  const twoTiers = groups.some((g) => g.tracks.some((t) => t.listing?.extended !== t.listing?.regular));
  return (
    <section ref={anchorRef} aria-label="Copies on sale" className="flex scroll-mt-[48px] flex-col gap-4">
      {groups.map((g, gi) => (
        <div key={g.productId} className="flex flex-col gap-4">
          <h3 className={T.section}>{isProjectScope(g.productId) ? "Whole project" : g.name}</h3>
          {gi === 0 && twoTiers && buyerId && (
            <p className={T.meta}>Choose This version, or With future updates to get every new version too.</p>
          )}
          {g.tracks.map((t) => (
            <CopyCard key={t.id} project={project} view={view} viewer={viewer} buyerId={buyerId} track={t as Listed} onBought={onBought} />
          ))}
        </div>
      ))}
    </section>
  );
}

function CopyCard({
  project,
  view,
  viewer,
  buyerId,
  track,
  onBought,
}: {
  project: ManualProject;
  view: ProjectView;
  viewer: Viewer;
  buyerId: DemoBuyerId | null;
  track: Listed;
  onBought: (sentence: string, track: EditionTrack) => void;
}) {
  const card = trackCardOf(track, view.sales);
  const name = `${KIND_LABEL[track.kind]} · ${USE_LABEL[track.use]}`;
  const oneTier = track.listing.extended === track.listing.regular;
  const [tier, setTier] = React.useState<EditionTier>("regular");
  const price = (t: EditionTier) => formatAmount(t === "regular" ? track.listing.regular : track.listing.extended, track.listing.token);
  return (
    <section aria-label={name} className={cn(LIST_CARD, "gap-4 p-6")}>
      <div className="flex items-baseline justify-between gap-4">
        <span className={cn(T.rowTitle, "min-w-0")}>{name}</span>
        <span className={cn(T.meta, "shrink-0 tabular-nums")}>{card.soldOut ? "Sold out" : `${card.sold} of ${card.total} sold`}</span>
      </div>
      {oneTier ? (
        <div className="flex items-baseline justify-between gap-4">
          <span className={T.meta}>{TIER_HELP.extended}</span>
          <span className={cn(T.rowTitle, "shrink-0 tabular-nums")}>{price("extended")}</span>
        </div>
      ) : buyerId ? (
        <div role="radiogroup" aria-label={`${name}: choose`} className="flex flex-col gap-4">
          {TIERS.map((t) => {
            const on = tier === t;
            return (
              <label
                key={t}
                className={cn(
                  "relative flex min-h-[44px] cursor-pointer items-start gap-4 rounded-lg border-[length:var(--border-width-1)] border-solid px-6 py-4 transition-colors duration-fast",
                  on ? "border-border-brand bg-bg-brand-subtle" : "border-border bg-bg-surface hover:bg-bg-subtle",
                )}
              >
                <input type="radio" name={`tier-${track.id}`} checked={on} onChange={() => setTier(t)} className="peer sr-only" />
                <Radio checked={on} decorative size="sm" className="mt-px peer-focus-visible:ring-2 peer-focus-visible:ring-border-focus" />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className={T.rowTitle}>{TIER_WORD[t]}</span>
                  {t === "extended" && <span className={T.meta}>{TIER_HELP.extended}</span>}
                </span>
                <span className={cn(T.rowTitle, "shrink-0 tabular-nums")}>{price(t)}</span>
              </label>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {TIERS.map((t) => (
            <div key={t} className="flex items-baseline justify-between gap-4">
              <span className={T.body}>{TIER_WORD[t]}</span>
              <span className={cn(T.rowTitle, "tabular-nums")}>{price(t)}</span>
            </div>
          ))}
        </div>
      )}
      <CopyActivity project={project} track={track} sales={view.sales} />
      {buyerId && <BuyCopy project={project} view={view} viewer={viewer} buyerId={buyerId} track={track} tier={oneTier ? "extended" : tier} soldOut={card.soldOut} total={card.total} onBought={onBought} label={`Buy now · ${price(oneTier ? "extended" : tier)}`} />}
    </section>
  );
}

function BuyCopy({
  project,
  view,
  viewer,
  buyerId,
  track,
  tier,
  soldOut,
  total,
  label,
  onBought,
}: {
  project: ManualProject;
  view: ProjectView;
  viewer: Viewer;
  buyerId: DemoBuyerId;
  track: Listed;
  tier: EditionTier;
  soldOut: boolean;
  total: number;
  label: string;
  onBought: (sentence: string, track: EditionTrack) => void;
}) {
  const { busyId, buy } = useEditionPurchase({ project, view, buyerId });
  const canBuy = !soldOut && can(viewer, "listing.buy", { ...view.canCtx, listingLive: true });
  if (soldOut) return <p className={T.body}>{`All ${total} are sold.`}</p>;
  if (!canBuy) return null;
  const busy = busyId === track.id;
  return (
    <Button
      hierarchy="secondary"
      size="xl"
      className="w-full"
      data-copy-buy=""
      aria-disabled={busy || undefined}
      onClick={async () => {
        if (busy) return;
        const done = await buy(track, tier);
        if (done) onBought(plainUseWords(done), track);
      }}
    >
      {label}
    </Button>
  );
}

/** A copy's activity line: its newest sale, else its newest entry, else when it was listed. */
function CopyActivity({ project, track, sales }: { project: ManualProject; track: Listed; sales: Sale[] }) {
  const { record } = useJourney(project.id);
  const sale = sales.filter((s) => s.item.nft !== "main" && s.item.trackId === track.id).reduce<Sale | null>((a, s) => (!a || s.at > a.at ? s : a), null);
  const entry = historyOf(record, project.id, { kind: track.kind, scope: track.productId })[0] ?? null;
  const line = sale
    ? `Bought by ${buyerLabel(sale.buyerId)} · ${formatAmount(sale.price, sale.token)} · ${formatDate(sale.at)}`
    : entry
      ? `${labelOf(entry)} · ${formatDate(entry.createdAt)}`
      : `No activity yet · listed ${formatDate(track.listing.listedAt)}`;
  return <p className={T.meta}>{line}</p>;
}
