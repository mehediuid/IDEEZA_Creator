"use client";

// The Marketplace box of another creator's sample (sample-market.ts; owner,
// 2026-11-16: the marketplace always has Innovations' data): the rail's first
// block, a RailBlock on the rail's one surface like a listing's of this
// browser (owner, 2026-11-24: one rail everywhere). The same box as
// this browser's own listings (buyer-rail.tsx, copy-panel.tsx): tabs Main NFT /
// Physical NFT / Virtual NFT, only the ones the post's rows sell, one panel at
// a time, each the same buy box — what is sold as the overline, the price
// large, one Buy now, the wallet line, then "NFT details" folded.
//
// A copy tab picks its Use, Personal use or Business use, each with its own
// price (owner, 2026-11-16: "there is no place to choose private or commercial
// use when buying"); a sold-out use stays, greyed. A purchase is the demo
// wallet's request, paid by the active demo creator and kept in the phone's
// store (phone-sample-sales.ts), so the web and the phone agree on what is
// sold. Selling the Main NFT sells the whole project: its copies come off with
// it. A card's clicked tag opens its tab (`initialTab`, the address's ?nft=).

import * as React from "react";
import { Button } from "@/components/ideeza";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import { helperLineOf } from "@/components/projects/editions/edition-block";
import { listingUnitsLine } from "@/lib/market/units";
import { useMinuteClock } from "@/components/projects/details/use-project-page-data";
import { formatDate } from "@/lib/manual/project-summary";
import {
  makeSampleSale,
  nextSampleSerial,
  offerStateOf,
  SAMPLE_NETWORK,
  sampleBuyBlock,
  sampleRequestOf,
  sampleSalesOf,
  STORAGE_FULL,
  withSampleSale,
  type SampleOffer,
  type SampleSale,
} from "@/lib/market/phone-sample-sales";
import { randomId } from "@/lib/market/sales";
import {
  SAMPLE_COLLECTION,
  SAMPLE_ROYALTIES_PCT,
  copyUseBlockOf,
  copyUsesOf,
  copyUseStateOf,
  type SampleMarket,
  type UseOffer,
} from "@/lib/market/sample-market";
import type { EditionKind } from "@/lib/market/types";
import { buyerLabel } from "@/lib/wallet/identities";
import { formatAmount } from "@/lib/wallet/money";
import { networkLabelOf } from "@/lib/wallet/request-view";
import type { DemoBuyerId } from "@/lib/wallet/types";
import { useActiveBuyer } from "@/lib/wallet/use-demo-wallet";
import { SeeWhatYouOwn } from "@/components/projects/purchased/see-what-you-own";
import { RailBlock } from "@/components/projects/details/rail-block";
import { readSampleSales, useSampleSales, writeSampleSales } from "@/components/mobile/project-earn/buyer/sample-sales-store";
import { useResales } from "@/components/projects/purchased/resales-store";
import { sampleSaleKeyOf } from "@/lib/market/purchases";
import { holderOf } from "@/lib/market/resales";
import { HolderOffers } from "./holder-offers";
import { ChoiceRows, FactGrid, LegalLine, MoreFacts, OfferTabs, OfferTop, ViewOnChain, WalletLine, type OfferTab } from "./offer-parts";

/** The web's words for a project sold in full (lib/market/purchase.ts). */
const LOCKED = "This project was sold in full, so its NFTs aren't for sale any more.";
const FACTS_NOTE = "Royalties are a share of resales, if marketplaces honour them. Lazy: the token is minted when you buy.";

const isUse = (o: SampleOffer | UseOffer): o is UseOffer => "use" in o;

export function SampleOfferBox({
  market,
  announce,
  initialTab,
}: {
  market: SampleMarket;
  announce: (message: string) => void;
  /** The tab a card's clicked tag asked for. */
  initialTab?: OfferTab | null;
}) {
  const all = useSampleSales();
  const { buyer } = useActiveBuyer();
  const now = useMinuteClock();
  const { request } = useWalletRequest();
  const [picked, setPicked] = React.useState<OfferTab | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const { feedId, post, offers } = market;
  const sales = React.useMemo(() => sampleSalesOf(feedId, all), [feedId, all]);
  const tabs = [...new Set(offers.map((o) => o.kind))] as OfferTab[];
  const held = sales.filter((s) => s.buyerId === buyer.id);
  const asked = initialTab && tabs.includes(initialTab) ? initialTab : null;
  const first: OfferTab = asked ?? (held.some((s) => s.kind === "main") ? "main" : (held.at(-1)?.kind ?? tabs[0]));
  const tab = picked && tabs.includes(picked) ? picked : first;

  /** Buys one offer: the Main NFT, or a copy for one use (its own count, its own sold-out). */
  const buy = async (o: SampleOffer | UseOffer) => {
    if (busy) return;
    const blockOf = (list: SampleSale[]) => (isUse(o) ? copyUseBlockOf(o, feedId, list) : sampleBuyBlock(o, feedId, list));
    const serialOf = (list: SampleSale[]) => (isUse(o) ? copyUseStateOf(o, feedId, list).count + 1 : nextSampleSerial(o, feedId, list));
    const req = sampleRequestOf({ title: post.title, offer: o, buyerId: buyer.id, serial: serialOf(readSampleSales()) });
    setBusy(o.name);
    try {
      const result = await request(req, {
        recheck: () => blockOf(readSampleSales()),
        commit: (proof) => {
          const stored = readSampleSales();
          const why = blockOf(stored);
          if (why) return { ok: false, conflict: true, message: why };
          const sale = makeSampleSale({
            id: randomId("psale"),
            projectId: feedId,
            offer: o,
            buyerId: buyer.id,
            buyerAddress: proof.address,
            serial: serialOf(stored),
            txHash: proof.txHash ?? "",
            at: proof.at,
          });
          // A copy's use was checked above; the Main NFT goes through the phone's own check.
          const next = isUse(o) ? { ok: true as const, sales: [...stored, sale] } : withSampleSale(stored, o, sale);
          if (!next.ok) return { ok: false, conflict: true, message: next.message };
          if (!writeSampleSales(next.sales)) return { ok: false, message: STORAGE_FULL };
          return { ok: true };
        },
      });
      if (result.ok) announce(`Purchase successful. ${req.doneLine}`);
    } finally {
      setBusy(null);
    }
  };

  const main = offers.find((o) => o.kind === "main") ?? null;
  return (
    <RailBlock title="Marketplace" collapsible={false}>
      <OfferTabs tabs={tabs} active={tab} onSelect={setPicked}>
        {tab === "main" && main ? (
          <MainPanel market={market} offer={main} sales={sales} buyerId={buyer.id} busy={busy === main.name} now={now} onBuy={() => buy(main)} />
        ) : (
          <CopyPanel
            key={tab}
            market={market}
            kind={tab as EditionKind}
            sales={sales}
            buyerId={buyer.id}
            busy={busy}
            now={now}
            onBuy={(o) => buy(o)}
            announce={announce}
          />
        )}
      </OfferTabs>
      {held.length > 0 && <SeeWhatYouOwn projectId={feedId} />}
    </RailBlock>
  );
}

function MainPanel({
  market,
  offer,
  sales,
  buyerId,
  busy,
  now,
  onBuy,
}: {
  market: SampleMarket;
  offer: SampleOffer;
  sales: SampleSale[];
  buyerId: DemoBuyerId;
  busy: boolean;
  now: number;
  onBuy: () => void;
}) {
  const { feedId, post } = market;
  const state = offerStateOf(offer, feedId, sales);
  const price = formatAmount(offer.price, offer.token);
  const sub = state.soldTo
    ? state.soldTo.buyerId === buyerId
      ? `You own the whole project · bought ${formatDate(state.soldTo.at)}`
      : `Sold to ${buyerLabel(state.soldTo.buyerId)} · ${formatDate(state.soldTo.at)}`
    : "Buy now · 100% of the project";
  return (
    <>
      <OfferTop overline="The whole project" price={price} sub={<span className="tabular-nums">{sub}</span>} />
      {!state.soldTo && (
        <>
          <BuyButton label={`Buy now: the whole project, ${price}`} busy={busy} onBuy={onBuy} />
          <WalletLine buyerId={buyerId} token={offer.token} network={SAMPLE_NETWORK} verb="buy" now={now} />
        </>
      )}
      <LegalLine />
      <MoreFacts>
        <FactGrid
          facts={[
            { label: "Listing", value: "Buy now" },
            { label: "Share", value: "100%" },
            { label: "Royalties", value: `${SAMPLE_ROYALTIES_PCT}%` },
            { label: "Minting", value: "Lazy" },
            { label: "Chain", value: networkLabelOf(SAMPLE_NETWORK) },
            { label: "Collection", value: SAMPLE_COLLECTION },
          ]}
        />
        <p className="m-0 text-sm text-text-tertiary">{FACTS_NOTE}</p>
        <ActivityLine last={state.soldTo} listedAt={post.sharedAt} />
      </MoreFacts>
      <ViewOnChain
        what={`Main NFT · ${post.title}`}
        record={{
          kind: "main",
          network: SAMPLE_NETWORK,
          collection: SAMPLE_COLLECTION,
          tokenId: null,
          lazy: true,
          holder: state.soldTo ? buyerLabel(state.soldTo.buyerId) : post.creator.name,
          txs: state.soldTo ? [{ at: state.soldTo.at, txHash: state.soldTo.txHash, serial: null, mine: state.soldTo.buyerId === buyerId }] : [],
        }}
      />
    </>
  );
}

function CopyPanel({
  market,
  kind,
  sales,
  buyerId,
  busy,
  now,
  onBuy,
  announce,
}: {
  market: SampleMarket;
  kind: EditionKind;
  sales: SampleSale[];
  buyerId: DemoBuyerId;
  busy: string | null;
  now: number;
  onBuy: (o: UseOffer) => void;
  announce: (message: string) => void;
}) {
  const { feedId, post } = market;
  const uses = copyUsesOf(market, kind);
  const open = uses.find((o) => copyUseBlockOf(o, feedId, sales) === null) ?? uses[0];
  const [pickedUse, setPickedUse] = React.useState<string | null>(null);
  const resales = useResales();
  if (!open) return null;
  const offer = uses.find((o) => o.use === pickedUse && copyUseBlockOf(o, feedId, sales) === null) ?? open;
  const state = copyUseStateOf(offer, feedId, sales);
  const blocked = copyUseBlockOf(offer, feedId, sales);
  const price = formatAmount(offer.price, offer.token);
  // Held now: a copy sold on is its new holder's (resales.ts). Each Use row says how many it holds.
  const ownedOf = (o: UseOffer) =>
    copyUseStateOf(o, feedId, sales).sales.filter((s) => holderOf(sampleSaleKeyOf(s) ?? s.id, s.buyerId, resales) === buyerId).length;
  const sub = state.of !== null ? `${state.count} of ${state.of} sold` : state.count ? `${state.count} sold` : null;

  return (
    <>
      <p className="m-0 text-sm text-text-secondary">{helperLineOf(kind, post.title)}</p>
      {kind === "physical" && <p className="m-0 text-sm text-text-secondary">{listingUnitsLine()}</p>}
      <ChoiceRows
        legend="Use"
        value={offer.use}
        onChange={setPickedUse}
        options={uses.map((o) => {
          const why = copyUseBlockOf(o, feedId, sales);
          return {
            value: o.use,
            label: o.use,
            aside: why ? (copyUseStateOf(o, feedId, sales).locked ? "Not for sale" : "Sold out") : formatAmount(o.price, o.token),
            disabled: why !== null,
            owned: ownedOf(o),
          };
        })}
      />
      <OfferTop overline={offer.name} price={price} sub={sub ? <span className="tabular-nums">{sub}</span> : undefined} />
      {blocked ? (
        <p className="m-0 text-md text-text-secondary">{state.locked ? LOCKED : blocked}</p>
      ) : (
        <>
          <BuyButton label={`Buy now: ${offer.name}, ${price}`} busy={busy === offer.name} onBuy={() => onBuy(offer)} />
          <WalletLine buyerId={buyerId} token={offer.token} network={SAMPLE_NETWORK} verb="buy" now={now} />
        </>
      )}
      <HolderOffers projectId={feedId} kind={kind} product={null} announce={announce} />
      <MoreFacts>
        <FactGrid
          facts={[
            { label: "Copies", value: state.of !== null ? `${state.of}` : "No limit" },
            { label: "Use", value: offer.use },
            { label: "Royalties", value: `${SAMPLE_ROYALTIES_PCT}%` },
            { label: "Minting", value: "Lazy" },
            { label: "Chain", value: networkLabelOf(SAMPLE_NETWORK) },
            { label: "Collection", value: SAMPLE_COLLECTION },
          ]}
        />
        <p className="m-0 text-sm text-text-tertiary">{FACTS_NOTE}</p>
        <ActivityLine last={state.sales.at(-1) ?? null} listedAt={post.sharedAt} />
      </MoreFacts>
      <ViewOnChain
        what={`${offer.name} · ${post.title}`}
        record={{
          kind: "copy",
          network: SAMPLE_NETWORK,
          collection: SAMPLE_COLLECTION,
          minted: state.count,
          of: state.of,
          txs: state.sales.map((s) => ({
            at: s.at,
            txHash: s.txHash,
            serial: s.serial,
            mine: holderOf(sampleSaleKeyOf(s) ?? s.id, s.buyerId, resales) === buyerId,
          })),
        }}
      />
    </>
  );
}

function BuyButton({ label, busy, onBuy }: { label: string; busy: boolean; onBuy: () => void }) {
  return (
    <Button
      type="button"
      hierarchy="primary"
      size="lg"
      className="h-[44px] w-full"
      aria-label={label}
      // Not `disabled`: that drops its focus before the wallet dialog reads its opener.
      aria-disabled={busy || undefined}
      onClick={(e) => {
        if (busy) return;
        // Safari doesn't focus a clicked button.
        e.currentTarget.focus();
        onBuy();
      }}
    >
      Buy now
    </Button>
  );
}

function ActivityLine({ last, listedAt }: { last: SampleSale | null; listedAt: number }) {
  return (
    <p className="m-0 text-sm text-text-secondary">
      <span className="font-semibold text-text-primary">Activity </span>
      {last ? `Bought by ${buyerLabel(last.buyerId)} · ${formatAmount(last.price, last.token)} · ${formatDate(last.at)}` : `No activity yet · listed ${formatDate(listedAt)}`}
    </p>
  );
}
