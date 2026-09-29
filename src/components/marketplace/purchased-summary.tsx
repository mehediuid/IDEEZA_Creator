"use client";

// Purchased Summary (Figma 41505:159161, 41505:158451; P2-MARKETPLACE-18 as
// changed, -20): what the active demo buyer holds of this project, first in
// the buyer rail's Marketplace block. A disclosure, open by default and
// collapsible; everything in it is read from the buyer's own `Sale` records
// (`holdingOf`, T04), summed over every purchase of this project.
//
// The Figma's "View on Blockchain" is not a link: a link would claim a record
// that doesn't exist, so the block says it isn't on one (§3.1: nothing links to
// an explorer). Under it, the secondary "Get creator support" and, once a
// request is sent, when it was.

import * as React from "react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, TestnetDemoBadge } from "@/components/ideeza";
import { formatDateTime } from "@/lib/manual/project-summary";
import type { Sale, SupportRequest } from "@/lib/market/types";
import { shortAddress } from "@/lib/wallet/demo-wallet";
import { addAmounts, formatAmount } from "@/lib/wallet/money";
import { networkLabelOf } from "@/lib/wallet/request-view";
import type { Amount, Coin, DemoBuyerId } from "@/lib/wallet/types";
import { cn } from "@/lib/utils";
import { RailFact, RailFacts } from "@/components/projects/details/rail-block";
import { useAfterDialogClose } from "./bid-card";
import { SupportDialog } from "./support-dialog";

/** Same-coin amounts summed, in first-seen order: "0.1 MATIC" or "0.05 MATIC + 5 USDC". */
function sumByCoin(parts: { amount: Amount; coin: Coin }[]): string {
  const out: { amount: Amount; coin: Coin }[] = [];
  for (const p of parts) {
    const at = out.findIndex((o) => o.coin === p.coin);
    if (at === -1) out.push({ ...p });
    else out[at] = { coin: p.coin, amount: addAmounts(out[at].amount, p.amount) };
  }
  return out.map((o) => formatAmount(o.amount, o.coin)).join(" + ");
}

export function PurchasedSummary({
  holding,
  buyerId,
  support,
  toggleRef,
  announce,
}: {
  /** `holdingOf(project, buyer, sales)`: the share and the Main sales behind it. */
  holding: { sharePct: number; sales: Sale[] };
  buyerId: DemoBuyerId;
  /** This project's support requests. */
  support: SupportRequest[];
  /** The disclosure button — where focus lands after a purchase's dialog closes. */
  toggleRef: React.RefObject<HTMLButtonElement | null>;
  announce: (message: string) => void;
}) {
  const [open, setOpen] = React.useState(true);
  const [asking, setAsking] = React.useState(false);
  const panelId = React.useId();
  const sentRef = React.useRef<HTMLParagraphElement>(null);
  const afterClose = useAfterDialogClose();

  const sales = [...holding.sales].sort((a, b) => a.at - b.at);
  const latest = sales[sales.length - 1];
  const n = sales.length;
  const tokenId = sales.find((s) => s.tokenId !== null)?.tokenId ?? null;
  const price = sumByCoin(sales.map((s) => ({ amount: s.price, coin: s.token })));
  const fee = sumByCoin(sales.map((s) => ({ amount: s.fees.network.amount, coin: s.fees.network.coin })));
  const sent = support
    .filter((r) => r.buyerId === buyerId)
    .reduce<SupportRequest | null>((a, r) => (!a || r.at > a.at ? r : a), null);

  return (
    <section aria-label="Purchased Summary" className="flex flex-col gap-6">
      <h3 className="m-0">
        <button
          ref={toggleRef}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
          className="flex min-h-[44px] w-full items-center gap-4 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <span className="text-md font-bold text-text-primary">Purchased Summary</span>
          <TestnetDemoBadge />
          <span
            aria-hidden
            className={cn(
              "ml-auto inline-flex shrink-0 text-text-tertiary transition-transform duration-normal ease-decelerate motion-reduce:transition-none",
              open && "rotate-180",
            )}
          >
            <Icon icon={ArrowDown01Icon} size={18} />
          </span>
        </button>
      </h3>
      <div id={panelId} hidden={!open} className="flex flex-col gap-6">
        <RailFacts>
          <RailFact label="Collection">{latest.collection}</RailFact>
          <RailFact label="Blockchain">{networkLabelOf(latest.network)}</RailFact>
          <RailFact label="NFT type">Main NFT</RailFact>
          <RailFact label="Token ID">
            <span className="tabular-nums">{tokenId !== null ? `#${tokenId}` : "Not assigned"}</span>
          </RailFact>
          <RailFact label="Your share">
            {holding.sharePct}% of the project{n > 1 ? ` in ${n} purchases` : ""}
          </RailFact>
          <RailFact label="Price paid">
            <span className="tabular-nums">
              {price} (+ {fee} network fee)
            </span>
          </RailFact>
          <RailFact label="Purchased from">You (the creator)</RailFact>
          <RailFact label="Transaction">
            <span title={latest.txHash} className="tabular-nums">
              <span aria-hidden>{shortAddress(latest.txHash)}</span>
              <span className="sr-only">{latest.txHash}</span> · Demo
            </span>
          </RailFact>
          <RailFact label="Purchased">
            <time dateTime={new Date(latest.at).toISOString()}>{formatDateTime(latest.at)}</time>
          </RailFact>
        </RailFacts>
        <p className="text-sm text-text-secondary">Not on a blockchain — this is a testnet demo.</p>
      </div>
      <div className="flex flex-col gap-3">
        <Button
          type="button"
          hierarchy="secondary"
          size="lg"
          className="h-[44px] w-full"
          onClick={() => setAsking(true)}
        >
          Get creator support
        </Button>
        {sent && (
          <p
            ref={sentRef}
            tabIndex={-1}
            className="rounded-sm text-sm text-text-secondary outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            Request sent <time dateTime={new Date(sent.at).toISOString()}>{formatDateTime(sent.at)}</time>
          </p>
        )}
      </div>
      <SupportDialog
        open={asking}
        sale={latest}
        onClose={() => setAsking(false)}
        onSent={() => {
          setAsking(false);
          announce("Support request sent to the creator.");
          afterClose(() => sentRef.current?.focus());
        }}
      />
    </section>
  );
}
