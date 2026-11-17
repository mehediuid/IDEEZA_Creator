"use client";

// One project's purchases, as the active demo creator holds them (owner, 2026-11-16: "if I buy a Physical NFT,
// how many copies, the permission; for a Virtual NFT, how many — everything must show"). From My projects ›
// Purchased; read from usePurchased (lib/market/purchases.ts). Top to bottom:
// - the header: the cover, the name, who made it and as whom it was bought, and the way to its marketplace page;
// - What you own: one row per kind × use (and per product, for a product's own copies) — how many copies, their
//   numbers of how many, what was paid, when;
// - What you can do: each use held, in one line (the prototype's words until the owner sets them);
// - Files: what comes with each kind held — said honestly as not delivered in this testnet demo;
// - Receipts: every purchase, its date, item, copy number, price and transaction;
// - the creator: support for this browser's own listing, the maker's card for a sample.

import * as React from "react";
import Link from "next/link";
import { ArrowRight01Icon, CpuIcon, File01Icon, ImageNotFound01Icon, ShoppingBag01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { StateCard, TestnetDemoBadge, buttonVariants } from "@/components/ideeza";
import { Page } from "@/components/ideeza/page";
import { CARD } from "@/components/innovations/post-bits";
import { MakerBlock } from "@/components/innovations/post-rail";
import { AskCreator } from "@/components/marketplace/buyer-rail";
import { LiveRegion, usePageArrival } from "@/components/projects/details/arrival";
import { Breadcrumb } from "@/components/projects/details/breadcrumb";
import { ProjectSkeleton } from "@/components/projects/details/page-states";
import { formatDate, formatDateTime } from "@/lib/manual/project-summary";
import { useMarket } from "@/lib/market/market-store";
import {
  copiesLineOf,
  FILES_OF,
  KIND_NAME,
  lineTitleOf,
  mainRuleOf,
  USE_RULES,
  type PurchaseKind,
  type PurchasedProject,
} from "@/lib/market/purchases";
import { sampleMarketOf } from "@/lib/market/sample-market";
import { shortAddress } from "@/lib/wallet/demo-wallet";
import { formatAmount } from "@/lib/wallet/money";
import type { DemoBuyer } from "@/lib/wallet/identities";
import { cn } from "@/lib/utils";
import { usePurchased } from "./use-purchased";

const H2 = "text-xl font-bold leading-xl text-text-primary";
const SECONDARY_LINK = cn(buttonVariants({ hierarchy: "secondary", size: "lg" }), "h-[44px] gap-2 hover:text-[color:var(--color-button-secondary-text)]");

export function PurchasedPage({ id }: { id: string }) {
  const { ready, buyer, purchases } = usePurchased();
  if (!ready) return <ProjectSkeleton />;
  const p = purchases.find((x) => x.id === id);
  if (!p) return <NothingBought buyerName={buyer.name} />;
  return <PurchasedBody p={p} buyer={buyer} />;
}

function PurchasedBody({ p, buyer }: { p: PurchasedProject; buyer: DemoBuyer }) {
  const { titleRef, live } = usePageArrival(`purchased:${p.id}`, p.name, `${p.name} · Purchased · IDEEZA`);
  const { data } = useMarket();
  const [imgOk, setImgOk] = React.useState(true);
  const sample = p.source === "sample" ? sampleMarketOf(p.id) : null;
  const receipts = p.lines
    .flatMap((l) => l.copies.map((c) => ({ line: l, copy: c })))
    .sort((a, b) => b.copy.at - a.copy.at);
  // Each use held once, per kind; the Main NFT by its share.
  const rights = p.lines.filter((l, i, all) => all.findIndex((x) => x.kind === l.kind && x.use === l.use) === i);
  const kindsHeld = [...new Set(p.lines.map((l) => l.kind))] as PurchaseKind[];

  return (
    <Page>
      <div className="flex flex-col gap-10">
        <Breadcrumb trail={[{ label: "My projects", href: "/projects" }, { label: "Purchased", href: "/projects?tab=purchased" }, { label: p.name }]} />

        <header className="flex flex-wrap items-center gap-8">
          <div className="relative aspect-[372/233] w-[200px] shrink-0 overflow-hidden rounded-[var(--radius-2xl)] bg-bg-surface-raised max-md:w-full">
            {p.cover && imgOk ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.cover} alt="" onError={() => setImgOk(false)} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-text-tertiary">
                <Icon icon={p.cover ? ImageNotFound01Icon : CpuIcon} size={20} strokeWidth={1.4} />
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <h1 ref={titleRef} tabIndex={-1} className="m-0 text-3xl font-semibold leading-3xl text-text-primary outline-none max-md:text-2xl max-md:leading-2xl">
              {p.name}
            </h1>
            <p className="m-0 text-md leading-md text-text-secondary">
              By {p.creator} · bought as {buyer.name} (demo creator) <TestnetDemoBadge className="ml-2 align-middle" />
            </p>
          </div>
          <Link href={p.marketHref} className={SECONDARY_LINK}>
            View on marketplace
            <Icon icon={ArrowRight01Icon} size={16} />
          </Link>
        </header>

        <section aria-labelledby="own" className={cn(CARD, "flex flex-col gap-6")}>
          <h2 id="own" className={H2}>
            What you own
          </h2>
          <ul role="list" className="m-0 flex list-none flex-col p-0">
            {p.lines.map((l) => {
              const last = l.copies[l.copies.length - 1];
              return (
                <li
                  key={`${l.kind}|${l.use}|${l.product}`}
                  className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2 border-x-0 border-b-0 border-t border-solid border-border py-5 first:border-t-0 first:pt-0"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-lg font-semibold leading-lg text-text-primary">{lineTitleOf(l)}</span>
                    <span className="text-md leading-md tabular-nums text-text-secondary">
                      {l.kind === "main" ? (l.sharePct !== null && l.sharePct >= 100 ? "The whole project, in one token" : "A share of the project") : copiesLineOf(l)}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-right">
                    <span className="text-lg font-semibold leading-lg tabular-nums text-text-primary">
                      {l.paid.map((x) => formatAmount(x.amount, x.token)).join(" + ")}
                    </span>
                    <span className="text-md leading-md text-text-tertiary">Last bought {formatDate(last.at)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="can" className={cn(CARD, "flex flex-col gap-6")}>
          <h2 id="can" className={H2}>
            What you can do
          </h2>
          <ul role="list" className="m-0 flex list-none flex-col gap-5 p-0">
            {rights.map((l) => (
              <li key={`${l.kind}|${l.use}`} className="flex flex-col gap-1">
                <span className="text-md font-semibold leading-md text-text-primary">
                  {l.kind === "main" ? KIND_NAME.main : `${KIND_NAME[l.kind]} · ${l.use}`}
                </span>
                <span className="text-md leading-md text-text-secondary">
                  {l.kind === "main" ? mainRuleOf(l.sharePct ?? 0) : USE_RULES[l.kind][l.use ?? "Personal use"]}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="files" className={cn(CARD, "flex flex-col gap-6")}>
          <h2 id="files" className={H2}>
            Files
          </h2>
          {kindsHeld.map((k) => (
            <div key={k} className="flex flex-col gap-3">
              <span className="text-md font-semibold leading-md text-text-primary">{KIND_NAME[k]}</span>
              <ul role="list" className="m-0 flex list-none flex-col gap-2 p-0">
                {FILES_OF[k].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-md leading-md text-text-secondary">
                    <span aria-hidden className="inline-flex text-text-tertiary">
                      <Icon icon={File01Icon} size={16} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="m-0 text-sm leading-sm text-text-tertiary">
            On the real marketplace these come with the NFT. This testnet demo has no files to download.
          </p>
        </section>

        <section aria-labelledby="receipts" className={cn(CARD, "flex flex-col gap-6")}>
          <h2 id="receipts" className={H2}>
            Receipts
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left text-md leading-md">
              <thead>
                <tr className="text-sm text-text-tertiary">
                  <th scope="col" className="pb-3 pr-6 font-medium">Date</th>
                  <th scope="col" className="pb-3 pr-6 font-medium">Item</th>
                  <th scope="col" className="pb-3 pr-6 font-medium">Copy</th>
                  <th scope="col" className="pb-3 pr-6 text-right font-medium">Price</th>
                  <th scope="col" className="pb-3 font-medium">Transaction</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map(({ line, copy }) => (
                  <tr key={copy.id} className="border-x-0 border-b-0 border-t border-solid border-border">
                    <td className="py-4 pr-6 text-text-secondary">
                      <time dateTime={new Date(copy.at).toISOString()}>{formatDateTime(copy.at)}</time>
                    </td>
                    <td className="py-4 pr-6 text-text-primary">{lineTitleOf(line)}</td>
                    <td className="py-4 pr-6 tabular-nums text-text-secondary">
                      {copy.serial !== null ? `#${copy.serial}${copy.of !== null ? ` of ${copy.of}` : ""}` : "—"}
                    </td>
                    <td className="py-4 pr-6 text-right tabular-nums text-text-primary">{formatAmount(copy.price, copy.token)}</td>
                    <td className="py-4 font-mono text-sm text-text-secondary" title={copy.txHash}>
                      {copy.txHash ? shortAddress(copy.txHash) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {sample ? (
          <MakerBlock post={sample.post} owner={false} layout="card" />
        ) : (
          <section aria-labelledby="creator" className={cn(CARD, "flex flex-col gap-6")}>
            <h2 id="creator" className={H2}>
              The creator
            </h2>
            <p className="m-0 text-md leading-md text-text-secondary">Questions about what you bought go to {p.creator}.</p>
            <div className="max-w-[320px]">
              <AskCreator projectId={p.id} sales={data.sales.filter((s) => s.projectId === p.id)} buyerId={buyer.id} />
            </div>
          </section>
        )}
      </div>
      <LiveRegion text={live} />
    </Page>
  );
}

function NothingBought({ buyerName }: { buyerName: string }) {
  return (
    <Page>
      <div className="flex justify-center px-8 py-40">
        <StateCard
          tone="empty"
          titleAs="h1"
          icon={<Icon icon={ShoppingBag01Icon} size={32} />}
          title={`${buyerName} hasn't bought anything of this project`}
          body="Purchases show under My projects › Purchased for the demo creator you shop as. Switch Shopping as on Explore marketplace to see another's."
          action={
            <Link href="/projects?tab=purchased" className={cn(buttonVariants({ hierarchy: "primary", size: "lg" }), "hover:text-[color:var(--color-button-primary-text)]")}>
              Back to Purchased
            </Link>
          }
        />
      </div>
    </Page>
  );
}
