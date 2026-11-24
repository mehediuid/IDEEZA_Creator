"use client";

// A Physical NFT or Virtual NFT tab of the Marketplace box (owner, 2026-11-15:
// "after the Main NFT so much information, then Physical, then Virtual — it
// isn't right"; "the product page shows that product's things, its own
// Physical and Virtual, never everything mixed"). One scope only: the project
// page's tabs sell the whole project's copies, a product page's tabs that
// product's (the dev app's Marketplace section, project and product).
//
// The same buy box as the Main NFT tab, so every tab reads alike:
// - what this kind gets you, said once (helperLineOf, the product page's line);
// - Use: Personal use and Business use, always both (owner, 2026-11-16:
//   "there is no place to choose private or commercial use when buying"),
//   each with its own price; a use the creator didn't list reads "Not on
//   sale" and a sold-out one "Sold out" — both stay, greyed, unpickable;
// - no Version choice (owner, 2026-11-15: "this won't be there"): the copy
//   sells at its listing's Price, the one price the Sell flow asks for;
// - the picked offer as the overline, its price large, the sold count under it;
// - one Buy now (the tab's one violet — one tab shows at a time), then the
//   wallet line; while every unit left is in another tab's checkout, Buy waits,
//   greyed, with "Someone is buying this now. Try again in a few minutes.";
// - NFT details, folded: collection, chain, royalties, minting, and the
//   offer's activity line.
// A preview reads the same choices and prices with no button and no wallet (PPL-6).

import * as React from "react";
import { Button, TestnetDemoBadge } from "@/components/ideeza";
import { helperLineOf } from "@/components/projects/editions/edition-block";
import { listingUnitsLine } from "@/lib/market/units";
import type { SlotProps } from "@/components/projects/details/slots";
import { historyOf, labelOf } from "@/lib/manual/journey";
import { useJourney } from "@/lib/manual/journey-store";
import { can } from "@/lib/manual/permissions";
import type { ProjectView } from "@/lib/manual/project-read";
import { formatDate } from "@/lib/manual/project-summary";
import { checkoutBlocks, IN_CHECKOUT_BUYER_LINE } from "@/lib/market/checkout-hold";
import { useCheckoutHolds } from "@/lib/market/checkout-hold-store";
import { editionChainOf, trackCardOf, tracksOf } from "@/lib/market/editions";
import { KIND_LABEL, USE_LABEL } from "@/lib/market/sell-flow";
import type { Token } from "@/lib/brief/types";
import type { EditionKind, EditionTrack, EditionUse, Listing, Sale } from "@/lib/market/types";
import { buyerLabel } from "@/lib/wallet/identities";
import { compareAmounts, formatAmount } from "@/lib/wallet/money";
import { networkLabelOf } from "@/lib/wallet/request-view";
import type { DemoBuyerId } from "@/lib/wallet/types";
import { cn } from "@/lib/utils";
import { ChoiceRows, FactGrid, MoreFacts, OfferTop, ViewOnChain, WalletLine } from "./offer-parts";
import { useEditionPurchase, type EditionTier } from "./purchase-dialog";
import { HolderOffers } from "./holder-offers";
import { useResales } from "@/components/projects/purchased/resales-store";
import { ownSaleKeyOf } from "@/lib/market/purchases";
import { holderOf } from "@/lib/market/resales";
import { PROJECT_SCOPE } from "@/lib/market/types";

const KINDS: EditionKind[] = ["physical", "virtual"];
const USES: EditionUse[] = ["private", "commercial"];

type Listed = EditionTrack & { listing: NonNullable<EditionTrack["listing"]> };

/** The scope's listed offers of one kind, Personal use first; none once the project is sold in full. */
function listedOf(view: ProjectView, scopeId: string, kind: EditionKind): Listed[] {
  if (view.lock !== null) return [];
  return tracksOf(scopeId, view.editions)
    .filter((t): t is Listed => t.kind === kind && t.listing !== null)
    .sort((a, b) => USES.indexOf(a.use) - USES.indexOf(b.use));
}

/** The kinds a scope has on sale, Physical first. */
export function listedKindsOf(view: ProjectView, scopeId: string): EditionKind[] {
  return KINDS.filter((k) => listedOf(view, scopeId, k).length > 0);
}

/** "Physical NFT on sale · from 0.008 ETH": what of a product's own is listed, at its lowest This
 *  version price — the shop's product card line (CL-018), read by the phone's product rows too. */
export function saleLineOf(view: ProjectView, productId: string): string | null {
  const kinds = listedKindsOf(view, productId);
  if (!kinds.length) return null;
  let low: { regular: string; token: Token } | null = null;
  for (const t of tracksOf(productId, view.editions)) {
    if (!t.listing || !kinds.includes(t.kind)) continue;
    if (!low || (t.listing.token === low.token && compareAmounts(t.listing.regular, low.regular) < 0)) low = t.listing;
  }
  const what = kinds.length > 1 ? "Physical and Virtual NFTs" : KIND_LABEL[kinds[0]];
  return low ? `${what} on sale · from ${formatAmount(low.regular, low.token)}` : `${what} on sale`;
}

/** The kind a buyer already holds in this scope, so the box opens on what they own. */
export function heldKindOf(
  view: ProjectView,
  scopeId: string,
  buyerId: DemoBuyerId | null,
  kinds: readonly EditionKind[],
): EditionKind | undefined {
  if (!buyerId) return undefined;
  const ids = new Set(tracksOf(scopeId, view.editions).map((t) => t.id));
  return kinds.find((k) => view.sales.some((s) => s.buyerId === buyerId && s.item.nft !== "main" && s.item.nft === k && ids.has(s.item.trackId)));
}

const soldLineOf = (sold: number, total: number) => (sold >= total ? `All ${total} sold` : `${sold} of ${total} sold`);

export function CopyPanel({
  project,
  view,
  viewer,
  now,
  scopeId,
  scopeName,
  kind,
  announce,
}: Pick<SlotProps, "project" | "view" | "viewer" | "now" | "announce"> & {
  /** `PROJECT_SCOPE` for the whole project, else the product's id. */
  scopeId: string;
  /** The project's or the product's name, in the helper line. */
  scopeName: string;
  kind: EditionKind;
}) {
  const offers = listedOf(view, scopeId, kind);
  const buyerId = viewer.kind === "demo-buyer" ? viewer.buyerId : null;
  const firstOpen = offers.find((t) => !trackCardOf(t, view.sales).soldOut) ?? offers[0];
  const [pickedUse, setPickedUse] = React.useState<string | null>(null);
  const resales = useResales();
  const main: Listing | null = view.listing.kind === "none" ? null : view.listing.listing;
  const chain = editionChainOf(view.mint.record, main, null);
  if (!firstOpen || !chain) return null;
  const track = offers.find((t) => t.id === pickedUse) ?? firstOpen;
  const card = trackCardOf(track, view.sales);
  // The listing's Price. Where the Sell flow's "Price with future updates" was left empty (the same
  // price), the updates come with it, as before.
  const tier: EditionTier = track.listing.regular === track.listing.extended ? "extended" : "regular";
  const price = formatAmount(track.listing.regular, track.listing.token);
  // Held now: a copy sold on is its new holder's (resales.ts). Each Use row says how many it holds.
  const ownedOn = (trackId: string) =>
    buyerId
      ? view.sales.filter((s) => s.item.nft !== "main" && s.item.trackId === trackId && holderOf(ownSaleKeyOf(s) ?? s.id, s.buyerId, resales) === buyerId).length
      : 0;
  const name = `${KIND_LABEL[kind]} · ${USE_LABEL[track.use]}`;

  return (
    <>
      {/* A buyer's Testnet demo badge sits by the money (WalletLine); a preview has no wallet line. */}
      {!buyerId && <TestnetDemoBadge className="self-start" />}
      <p className="m-0 text-sm text-text-secondary">{helperLineOf(kind, scopeName)}</p>
      {kind === "physical" && <p className="m-0 text-sm text-text-secondary">{listingUnitsLine()}</p>}

      <ChoiceRows
        legend="Use"
        value={track.id}
        onChange={setPickedUse}
        options={USES.map((use) => {
          const t = offers.find((o) => o.use === use);
          if (!t) return { value: `none:${use}`, label: USE_LABEL[use], aside: "Not on sale", disabled: true };
          const soldOut = trackCardOf(t, view.sales).soldOut;
          return { value: t.id, label: USE_LABEL[use], aside: soldOut ? "Sold out" : formatAmount(t.listing.regular, t.listing.token), disabled: soldOut, owned: ownedOn(t.id) };
        })}
      />

      <OfferTop
        overline={name}
        price={price}
        sub={
          <span className="tabular-nums">
            {soldLineOf(card.sold, card.total)}
          </span>
        }
      />

      {buyerId && !card.soldOut && (
        <BuyCopy
          project={project}
          view={view}
          viewer={viewer}
          buyerId={buyerId}
          track={track}
          tier={tier}
          label={`Buy now: ${name}, ${price}`}
          available={card.total - card.sold}
          announce={announce}
        />
      )}
      {buyerId && <WalletLine buyerId={buyerId} token={track.listing.token} network={chain.network} verb="buy" now={now} />}
      {buyerId && <HolderOffers projectId={project.id} kind={kind} product={scopeId === PROJECT_SCOPE ? null : scopeName} announce={announce} />}

      <MoreFacts>
        <FactGrid
          facts={[
            { label: "Copies", value: `${card.total}` },
            { label: "Royalties", value: `${track.listing.royaltyPct}%` },
            { label: "Minting", value: "Lazy" },
            { label: "Chain", value: networkLabelOf(chain.network) },
            { label: "Collection", value: chain.collection || "—" },
          ]}
        />
        <p className="m-0 text-sm text-text-tertiary">
          Royalties are a share of resales, if marketplaces honour them. Lazy: the token is minted when you buy.
        </p>
        <CopyActivity project={project} track={track} sales={view.sales} />
      </MoreFacts>
      <ViewOnChain
        what={`${name} · ${scopeName}`}
        record={{
          kind: "copy",
          network: chain.network,
          collection: chain.collection,
          minted: card.sold,
          of: card.total,
          txs: view.sales
            .filter((s) => s.item.nft !== "main" && s.item.trackId === track.id)
            .map((s) => ({
              at: s.at,
              txHash: s.txHash,
              serial: s.item.nft !== "main" ? s.item.serial : null,
              mine: buyerId !== null && holderOf(ownSaleKeyOf(s) ?? s.id, s.buyerId, resales) === buyerId,
            })),
        }}
      />
    </>
  );
}

/** The tab's one Buy now: the picked offer at its price, straight to the wallet. */
function BuyCopy({
  project,
  view,
  viewer,
  buyerId,
  track,
  tier,
  label,
  available,
  announce,
}: {
  project: SlotProps["project"];
  view: ProjectView;
  viewer: SlotProps["viewer"];
  buyerId: DemoBuyerId;
  track: Listed;
  tier: EditionTier;
  label: string;
  available: number;
  announce: (m: string) => void;
}) {
  const { busyId, buy } = useEditionPurchase({ project, view, buyerId, versionless: true });
  const holds = useCheckoutHolds();
  const heldId = React.useId();
  if (!can(viewer, "listing.buy", { ...view.canCtx, listingLive: true })) return null;
  const busy = busyId === track.id;
  const held = checkoutBlocks(holds.others(track.id), available);
  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        hierarchy="primary"
        size="lg"
        className={cn("h-[44px] w-full", held && "cursor-not-allowed opacity-60")}
        aria-label={label}
        // Not `disabled`: that drops its focus before the wallet dialog reads its opener.
        aria-disabled={busy || held || undefined}
        aria-describedby={held ? heldId : undefined}
        onClick={async (e) => {
          if (busy || held) return;
          // Safari doesn't focus a clicked button.
          e.currentTarget.focus();
          const done = await buy(track, tier);
          if (done) announce(done);
        }}
      >
        Buy now
      </Button>
      {held && (
        <p id={heldId} className="m-0 text-md text-text-secondary">
          {IN_CHECKOUT_BUYER_LINE}
        </p>
      )}
    </div>
  );
}

/** An offer's activity line: its newest sale, else its newest entry, else when it was listed (the phone's words). */
function CopyActivity({ project, track, sales }: { project: SlotProps["project"]; track: Listed; sales: Sale[] }) {
  const { record } = useJourney(project.id);
  const sale = sales
    .filter((s) => s.item.nft !== "main" && s.item.trackId === track.id)
    .reduce<Sale | null>((a, s) => (!a || s.at > a.at ? s : a), null);
  const entry = historyOf(record, project.id, { kind: track.kind, scope: track.productId })[0] ?? null;
  const line = sale
    ? `Bought by ${buyerLabel(sale.buyerId)} · ${formatAmount(sale.price, sale.token)} · ${formatDate(sale.at)}`
    : entry
      ? `${labelOf(entry)} · ${formatDate(entry.createdAt)}`
      : `No activity yet · listed ${formatDate(track.listing.listedAt)}`;
  return (
    <p className="m-0 text-sm text-text-secondary">
      <span className="font-semibold text-text-primary">Activity </span>
      {line}
    </p>
  );
}
