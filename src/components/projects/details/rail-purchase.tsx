"use client";

// The Purchase block of a project bought whole (owner, 2026-11-19: "a Main NFT bought opens like normal project
// details, and somewhere there it shows the purchase information — no purchase view, then Open project"). The buyer's
// own project page, with one more block in its rail, right after the Marketplace block: who it was bought from (to
// the listing it was bought on), what was paid and when, the share and token, the chain and the transaction, and
// what owning it allows. Only on a project bought (its `acquired` record) and only for its owner, never in a preview.

import * as React from "react";
import Link from "next/link";
import { TestnetDemoBadge } from "@/components/ideeza";
import { useSampleSales } from "@/components/mobile/project-earn/buyer/sample-sales-store";
import type { Token } from "@/lib/brief/types";
import { formatDate } from "@/lib/manual/project-summary";
import { SAMPLE_COLLECTION } from "@/lib/market/sample-market";
import { shortAddress } from "@/lib/wallet/demo-wallet";
import { buyerLabel } from "@/lib/wallet/identities";
import { formatAmount } from "@/lib/wallet/money";
import { networkLabelOf } from "@/lib/wallet/request-view";
import { RailBlock, RailFact, RailFacts } from "./rail-block";
import type { SlotProps } from "./slots";

const LINK =
  "rounded-sm font-medium text-text-link outline-none underline-offset-2 hover:text-text-link-hover hover:underline focus-visible:ring-2 focus-visible:ring-border-focus";

export function RailPurchase({ project, viewer }: SlotProps) {
  const sales = useSampleSales();
  const a = project.acquired;
  if (!a || viewer.kind !== "local-owner") return null;
  const sale = sales.find((s) => s.id === a.saleId) ?? null;
  const tokenId = project.mint?.tokenId ?? null;
  return (
    <RailBlock title="Purchase" meta={`Bought from ${a.from}`}>
      <p className="m-0 text-md leading-md text-text-secondary">
        You bought the whole project, so it&apos;s one of yours: open it, edit it, build it and sell it again.
      </p>
      <RailFacts>
        <RailFact label="Bought from">
          <Link href={`/marketplace/${encodeURIComponent(a.feedId)}`} className={LINK}>
            {a.from}
          </Link>
        </RailFact>
        <RailFact label="Price paid">
          <span className="tabular-nums">{formatAmount(a.price, a.token as Token)}</span>
        </RailFact>
        <RailFact label="Bought on">{formatDate(a.at)}</RailFact>
        <RailFact label="Your share">100% · Main NFT</RailFact>
        {tokenId !== null && (
          <RailFact label="Token">
            #{tokenId} · {SAMPLE_COLLECTION}
          </RailFact>
        )}
        {sale && <RailFact label="Blockchain">{networkLabelOf(sale.network)}</RailFact>}
        {sale?.txHash ? (
          <RailFact label="Transaction">
            <span className="font-mono text-sm" title={sale.txHash}>
              {shortAddress(sale.txHash)}
            </span>
          </RailFact>
        ) : null}
        {sale && (
          <RailFact label="Bought as">
            <span className="inline-flex flex-wrap items-center gap-2">
              {buyerLabel(sale.buyerId)}
              <TestnetDemoBadge />
            </span>
          </RailFact>
        )}
      </RailFacts>
    </RailBlock>
  );
}
