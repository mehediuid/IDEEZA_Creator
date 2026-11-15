"use client";

// 18h · Copies on sale: the project's listed Physical and Virtual NFTs under
// the Main NFT (the web's edition-offers.tsx on a phone) — the whole
// project's first ("Whole project"), then each product's. Owner 2026-11-12
// (the page read as a spreadsheet, a Buy on every card): one row per copy,
// as a product page lists its options — a Physical or Virtual mark, "Virtual
// NFT · Personal use", the price ("From" when there are two), a thin sold
// bar with "0 of 100 sold", the copy's activity line, and a small Buy. A copy
// with two prices asks which in a bottom sheet — This version, or With
// future updates — before the wallet does. Buying is the web's
// `useEditionPurchase` through the phone's wallet sheet, in the owner's
// licence words. A preview reads the prices with no button. Only the lock
// (sold in full) hides them.

import * as React from "react";
import { CubeIcon, PackageIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
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
import { LIST_CARD, LIST_DIVIDERS } from "../../kit/list";
import { Sheet } from "../../kit/sheet";
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
  return (
    <section ref={anchorRef} aria-labelledby="bv-copies" className="flex scroll-mt-[48px] flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h3 id="bv-copies" className={T.section}>
          Copies
        </h3>
        <p className={T.meta}>Each with its own NFT.</p>
      </div>
      {groups.map((g) => (
        <div key={g.productId} className="flex flex-col gap-3">
          {(groups.length > 1 || !isProjectScope(g.productId)) && <h4 className={T.rowTitle}>{isProjectScope(g.productId) ? "Whole project" : g.name}</h4>}
          <ul aria-label={isProjectScope(g.productId) ? "Copies of the whole project" : `Copies of ${g.name}`} className={cn(LIST_CARD, LIST_DIVIDERS)}>
            {g.tracks.map((t) => (
              <CopyRow key={t.id} project={project} view={view} viewer={viewer} buyerId={buyerId} track={t as Listed} onBought={onBought} />
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function CopyRow({
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
  const price = (t: EditionTier) => formatAmount(t === "regular" ? track.listing.regular : track.listing.extended, track.listing.token);
  const share = card.total ? Math.min(100, Math.round((card.sold / card.total) * 100)) : 0;
  return (
    <li className="flex items-center gap-6 px-8 py-6">
      <span aria-hidden className="inline-flex size-[40px] shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-[color:var(--color-icon-default)]">
        <Icon icon={track.kind === "physical" ? PackageIcon : CubeIcon} size={20} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={cn(T.rowTitle, "break-words")}>{name}</span>
        {/* One price; or "From" with Buy's sheet to choose; a preview, with no Buy, names both. */}
        <span className={cn(T.meta, "tabular-nums text-text-primary")}>
          {oneTier
            ? price("extended")
            : buyerId
              ? `From ${price("regular")}`
              : `${TIER_WORD.regular} ${price("regular")} · ${TIER_WORD.extended} ${price("extended")}`}
        </span>
        <span className="flex items-center gap-3">
          <span aria-hidden className="h-[4px] w-[56px] shrink-0 overflow-hidden rounded-full bg-[var(--color-border-default)]">
            <span className="block h-full rounded-full bg-bg-brand" style={{ width: `${share}%` }} />
          </span>
          <span className={cn(T.caption, "tabular-nums")}>{card.soldOut ? `All ${card.total} sold` : `${card.sold} of ${card.total} sold`}</span>
        </span>
        <CopyActivity project={project} track={track} sales={view.sales} />
      </div>
      {buyerId && !card.soldOut && (
        <BuyCopy project={project} view={view} viewer={viewer} buyerId={buyerId} track={track} name={name} oneTier={oneTier} price={price} onBought={onBought} />
      )}
    </li>
  );
}

/** The row's small Buy: straight to the wallet with one price; with two, a sheet asks which first. */
function BuyCopy({
  project,
  view,
  viewer,
  buyerId,
  track,
  name,
  oneTier,
  price,
  onBought,
}: {
  project: ManualProject;
  view: ProjectView;
  viewer: Viewer;
  buyerId: DemoBuyerId;
  track: Listed;
  name: string;
  oneTier: boolean;
  price: (t: EditionTier) => string;
  onBought: (sentence: string, track: EditionTrack) => void;
}) {
  const { busyId, buy } = useEditionPurchase({ project, view, buyerId });
  const [choosing, setChoosing] = React.useState(false);
  const [tier, setTier] = React.useState<EditionTier>("regular");
  if (!can(viewer, "listing.buy", { ...view.canCtx, listingLive: true })) return null;
  const busy = busyId === track.id;
  const go = async (t: EditionTier) => {
    if (busy) return;
    setChoosing(false);
    const done = await buy(track, t);
    if (done) onBought(plainUseWords(done), track);
  };
  return (
    <>
      <Button
        hierarchy="secondary"
        size="md"
        className="shrink-0"
        data-copy-buy=""
        aria-label={oneTier ? `Buy ${name} for ${price("extended")}` : `Buy ${name}, from ${price("regular")}`}
        aria-haspopup={oneTier ? undefined : "dialog"}
        aria-disabled={busy || undefined}
        loading={busy}
        onClick={() => (oneTier ? void go("extended") : setChoosing(true))}
      >
        Buy
      </Button>
      {!oneTier && (
        <Sheet
          open={choosing}
          onClose={() => setChoosing(false)}
          title={name}
          description="Choose This version, or With future updates to get every new version too."
          actions={
            <>
              <Button size="xl" className="w-full" onClick={() => void go(tier)}>
                {`Buy now · ${price(tier)}`}
              </Button>
            </>
          }
        >
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
                    <span className={T.meta}>{TIER_HELP[t]}</span>
                  </span>
                  <span className={cn(T.rowTitle, "shrink-0 tabular-nums")}>{price(t)}</span>
                </label>
              );
            })}
          </div>
        </Sheet>
      )}
    </>
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
  return <span className={T.caption}>{line}</span>;
}
