"use client";

// A purchase's receipts, on the phone (CL-035 › Receipts; the web's table, as rows): newest first, each the item
// ("Physical NFT · Business use", "… · from {holder}", "Sold to {name} · …"), the date, the copy and the
// transaction (shortened), with the price at the end — a sale on in the success ink with +. Numbers and prices
// never wrap.

import * as React from "react";
import { usePurchased } from "@/components/projects/purchased/use-purchased";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { formatDateTime } from "@/lib/manual/project-summary";
import { KIND_NAME, lineTitleOf, wholeProjectOnly, type PurchasedProject } from "@/lib/market/purchases";
import { shortAddress } from "@/lib/wallet/demo-wallet";
import { formatAmount } from "@/lib/wallet/money";
import { cn } from "@/lib/utils";
import { LIST_CARD, LIST_DIVIDERS } from "../kit/list";
import { OfflineBanner } from "../kit/states";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { NothingBought, numberOf, PurchasedLoading } from "./parts";
import { PURCHASED_TAB_HREF, purchasedPath, purchasedPhoneHrefOf } from "./paths";

type Row = { id: string; at: number; item: string; number: string; price: string; tx: string; sold: boolean };

export function receiptRowsOf(p: PurchasedProject): Row[] {
  return [
    ...p.lines.flatMap((l) =>
      l.copies.map((c) => ({
        id: c.id,
        at: c.at,
        item: `${lineTitleOf(l)}${c.from ? ` · from ${c.from}` : ""}`,
        number: numberOf(c.serial, c.of),
        price: formatAmount(c.price, c.token),
        tx: c.txHash,
        sold: false,
      })),
    ),
    ...p.sold.map((s) => ({
      id: s.id,
      at: s.at,
      item: `Sold to ${s.to} · ${[KIND_NAME[s.kind], s.use, s.product].filter(Boolean).join(" · ")}`,
      number: numberOf(s.serial, s.of),
      price: formatAmount(s.price, s.token),
      tx: s.txHash,
      sold: true,
    })),
  ].sort((a, b) => b.at - a.at);
}

export function ReceiptsScreen({ id }: { id: string }) {
  const { ready, buyer, purchases } = usePurchased();
  const back = purchasedPath(id);
  if (!ready) return <PurchasedLoading back={back} title="Receipts" />;
  const p = purchases.find((x) => x.id === id);
  if (!p || wholeProjectOnly(p)) return <NothingBought buyerName={buyer.name} back={p ? purchasedPhoneHrefOf(p) : PURCHASED_TAB_HREF} />;
  const rows = receiptRowsOf(p);
  return (
    <Screen top={<TopBar back={back} title="Receipts" />}>
      <OfflineBanner />
      <div className="flex flex-col gap-6 px-8 pb-12 pt-2">
        <div className="flex items-center justify-between gap-4">
          <p className={T.meta}>{p.name}</p>
          <TestnetDemoBadge />
        </div>
        <ul aria-label="Receipts" className={cn(LIST_CARD, LIST_DIVIDERS)}>
          {rows.map((r) => (
            <li key={r.id} className="flex items-start gap-6 px-8 py-6">
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className={cn(T.body, "break-words text-text-primary")}>{r.item}</span>
                <span className={T.meta}>
                  <time dateTime={new Date(r.at).toISOString()}>{formatDateTime(r.at)}</time>
                  {" · "}
                  <span className="whitespace-nowrap tabular-nums">{r.number}</span>
                </span>
                <span className={cn(T.meta, "font-mono text-text-tertiary")} title={r.tx}>
                  {r.tx ? shortAddress(r.tx) : "—"}
                </span>
              </span>
              <span className={cn(T.rowTitle, "shrink-0 whitespace-nowrap tabular-nums", r.sold && "text-text-success")}>
                {r.sold ? "+" : ""}
                {r.price}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Screen>
  );
}
