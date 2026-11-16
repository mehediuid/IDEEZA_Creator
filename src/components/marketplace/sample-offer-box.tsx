"use client";

// The Marketplace box of another creator's sample (sample-market.ts; owner,
// 2026-11-16: the marketplace always has Innovations' data). The same box as
// this browser's own listings (buyer-rail.tsx, copy-panel.tsx): tabs Main NFT /
// Physical NFT / Virtual NFT, only the ones the post's rows sell, one panel at
// a time, each the same buy box — what is sold as the overline, the price
// large, one Buy now, the wallet line, then "NFT details" folded.
//
// The rows are the offers, so a copy has no Use or Version to pick: the post
// names its licence once. A purchase is the demo wallet's request, paid by the
// active demo creator and kept in the phone's store (phone-sample-sales.ts),
// so the web and the phone agree on what is sold and who holds it. Selling the
// Main NFT sells the whole project: its copies come off with it.

import * as React from "react";
import { Button } from "@/components/ideeza";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import { helperLineOf } from "@/components/projects/editions/edition-block";
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
import { SAMPLE_COLLECTION, SAMPLE_ROYALTIES_PCT, type SampleMarket } from "@/lib/market/sample-market";
import { buyerLabel } from "@/lib/wallet/identities";
import { formatAmount } from "@/lib/wallet/money";
import { networkLabelOf } from "@/lib/wallet/request-view";
import type { DemoBuyerId } from "@/lib/wallet/types";
import { useActiveBuyer } from "@/lib/wallet/use-demo-wallet";
import { CARD } from "@/components/innovations/post-bits";
import { readSampleSales, useSampleSales, writeSampleSales } from "@/components/mobile/project-earn/buyer/sample-sales-store";
import { cn } from "@/lib/utils";
import { FactGrid, LegalLine, MoreFacts, OfferTabs, OfferTop, WalletLine, type OfferTab } from "./offer-parts";

/** The web's words for a project sold in full (lib/market/purchase.ts). */
const LOCKED = "This project was sold in full, so its NFTs aren't for sale any more.";
const FACTS_NOTE = "Royalties are a share of resales, if marketplaces honour them. Lazy: the token is minted when you buy.";

export function SampleOfferBox({
  market,
  announce,
  className,
}: {
  market: SampleMarket;
  announce: (message: string) => void;
  className?: string;
}) {
  const all = useSampleSales();
  const { buyer } = useActiveBuyer();
  const now = useMinuteClock();
  const { request } = useWalletRequest();
  const [picked, setPicked] = React.useState<OfferTab | null>(null);
  const [busy, setBusy] = React.useState<SampleOffer["kind"] | null>(null);
  const { feedId, post, offers } = market;
  const sales = React.useMemo(() => sampleSalesOf(feedId, all), [feedId, all]);
  const tabs = [...new Set(offers.map((o) => o.kind))] as OfferTab[];
  const held = sales.filter((s) => s.buyerId === buyer.id);
  const first: OfferTab = held.some((s) => s.kind === "main") ? "main" : (held.at(-1)?.kind ?? tabs[0]);
  const tab = picked && tabs.includes(picked) ? picked : first;
  const offer = offers.find((o) => o.kind === tab) ?? offers[0];

  const buy = async (o: SampleOffer) => {
    if (busy) return;
    const req = sampleRequestOf({ title: post.title, offer: o, buyerId: buyer.id, serial: nextSampleSerial(o, feedId, readSampleSales()) });
    setBusy(o.kind);
    try {
      const result = await request(req, {
        recheck: () => sampleBuyBlock(o, feedId, readSampleSales()),
        commit: (proof) => {
          const stored = readSampleSales();
          const sale = makeSampleSale({
            id: randomId("psale"),
            projectId: feedId,
            offer: o,
            buyerId: buyer.id,
            buyerAddress: proof.address,
            serial: nextSampleSerial(o, feedId, stored),
            txHash: proof.txHash ?? "",
            at: proof.at,
          });
          const next = withSampleSale(stored, o, sale);
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

  return (
    <section aria-labelledby={`${feedId}-market`} className={cn(CARD, "flex flex-col gap-7", className)}>
      <h2 id={`${feedId}-market`} className="text-lg font-bold leading-lg text-text-primary">
        Marketplace
      </h2>
      <OfferTabs tabs={tabs} active={tab} onSelect={setPicked}>
        <OfferPanel
          key={offer.kind}
          market={market}
          offer={offer}
          sales={sales}
          buyerId={buyer.id}
          busy={busy === offer.kind}
          now={now}
          onBuy={() => buy(offer)}
        />
      </OfferTabs>
    </section>
  );
}

function OfferPanel({
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
  const main = offer.kind === "main";
  const price = formatAmount(offer.price, offer.token);
  const owned = sales.filter((s) => s.buyerId === buyerId && s.kind === offer.kind).length;
  const blocked = sampleBuyBlock(offer, feedId, sales);
  const last = sales.filter((s) => s.kind === offer.kind).at(-1) ?? null;

  const sub = main
    ? state.soldTo
      ? state.soldTo.buyerId === buyerId
        ? `You own the whole project · bought ${formatDate(state.soldTo.at)}`
        : `Sold to ${buyerLabel(state.soldTo.buyerId)} · ${formatDate(state.soldTo.at)}`
      : "Buy now · 100% of the project"
    : [state.of !== null ? `${state.count} of ${state.of} sold` : state.count ? `${state.count} sold` : null, owned > 0 ? `you own ${owned}` : null]
        .filter(Boolean)
        .join(" · ") || null;

  return (
    <>
      {!main && <p className="m-0 text-sm text-text-secondary">{helperLineOf(offer.kind as "physical" | "virtual", post.title)}</p>}
      <OfferTop overline={main ? "The whole project" : offer.name} price={price} sub={sub ? <span className="tabular-nums">{sub}</span> : undefined} />
      {blocked ? (
        !state.soldTo && <p className="m-0 text-md text-text-secondary">{state.locked ? LOCKED : blocked}</p>
      ) : (
        <>
          <Button
            type="button"
            hierarchy="primary"
            size="lg"
            className="h-[44px] w-full"
            aria-label={`Buy now: ${main ? "the whole project" : offer.name}, ${price}`}
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
          <WalletLine buyerId={buyerId} token={offer.token} network={SAMPLE_NETWORK} verb="buy" now={now} />
        </>
      )}
      {main && <LegalLine />}
      <MoreFacts>
        <FactGrid
          facts={[
            main ? { label: "Listing", value: "Buy now" } : { label: "Copies", value: state.of !== null ? `${state.of}` : "No limit" },
            ...(main ? [{ label: "Share", value: "100%" }] : []),
            { label: "Royalties", value: `${SAMPLE_ROYALTIES_PCT}%` },
            { label: "Minting", value: "Lazy" },
            { label: "Chain", value: networkLabelOf(SAMPLE_NETWORK) },
            { label: "Collection", value: SAMPLE_COLLECTION },
          ]}
        />
        <p className="m-0 text-sm text-text-tertiary">{FACTS_NOTE}</p>
        <p className="m-0 text-sm text-text-secondary">
          <span className="font-semibold text-text-primary">Activity </span>
          {last
            ? `Bought by ${buyerLabel(last.buyerId)} · ${formatAmount(last.price, last.token)} · ${formatDate(last.at)}`
            : `No activity yet · listed ${formatDate(post.sharedAt)}`}
        </p>
      </MoreFacts>
    </>
  );
}
