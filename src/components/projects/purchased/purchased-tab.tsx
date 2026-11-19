"use client";

// My projects › Purchased (owner, 2026-11-16: "anything bought goes to My projects"): one card per project the
// active demo creator bought from, in the marketplace card's frame (the design system's Asset Card, M25) so a
// bought thing looks like where it came from. Each card: the cover, the name, who made it, what is held as
// chips ("Whole project · 100%", "Physical NFT ×2", "Virtual NFT ×1"), the uses held, then how many NFTs and
// when last bought. The whole card opens the purchased page (/projects/purchased/<id>).
//
// The prototype's slim Testnet demo strip sits on top: purchases are a demo creator's, and "Shopping as" says
// whose these are and switches them.

import * as React from "react";
import Link from "next/link";
import { CpuIcon, ImageNotFound01Icon, ShoppingBag01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { StateCard, Tag, buttonVariants } from "@/components/ideeza";
import { PAGE_GRID } from "@/components/ideeza/page";
import { DemoBuyerBanner } from "@/components/marketplace/demo-buyer-banner";
import { formatDate } from "@/lib/manual/project-summary";
import { cardChipsOf, usesOf, type PurchasedProject } from "@/lib/market/purchases";
import { cn } from "@/lib/utils";

export const purchasedHref = (id: string) => `/projects/purchased/${encodeURIComponent(id)}`;

export function PurchasedTab({ purchases, buyerName }: { purchases: PurchasedProject[]; buyerName: string }) {
  return (
    <div className="mt-[16px] flex flex-col gap-8">
      <DemoBuyerBanner />
      <p aria-live="polite" className="m-0 text-md font-medium text-text-secondary">
        {purchases.length === 0
          ? `Nothing bought as ${buyerName} yet`
          : `${purchases.length} ${purchases.length === 1 ? "project" : "projects"} bought as ${buyerName} (demo creator)`}
      </p>
      {purchases.length === 0 ? (
        <StateCard
          tone="empty"
          icon={<Icon icon={ShoppingBag01Icon} size={32} />}
          title="Nothing bought yet"
          body={`What ${buyerName} buys on Explore marketplace shows here: the whole project or its copies, how many, and what each use allows.`}
          action={
            <Link href="/marketplace" className={cn(buttonVariants({ hierarchy: "primary", size: "lg" }), "hover:text-[color:var(--color-button-primary-text)]")}>
              Explore marketplace
            </Link>
          }
        />
      ) : (
        <ul role="list" className={PAGE_GRID}>
          {purchases.map((p) => (
            <li key={`${p.source}:${p.id}`}>
              <PurchasedCard p={p} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PurchasedCard({ p }: { p: PurchasedProject }) {
  const [imgOk, setImgOk] = React.useState(true);
  const uses = usesOf(p);
  return (
    <article className="group relative flex h-full flex-col gap-[20px] overflow-hidden rounded-[var(--radius-2xl)] border border-solid border-[color-mix(in_srgb,var(--color-violet-200)_20%,transparent)] bg-bg-surface px-[12px] pb-[20px] pt-[12px] transition-colors duration-fast motion-reduce:transition-none [container-type:inline-size] [@media(hover:hover)]:hover:border-[color:var(--color-violet-300)]">
      <div className="relative h-[62.63cqw] w-full shrink-0 overflow-hidden rounded-[var(--radius-2xl)] bg-bg-surface-raised">
        {p.cover && imgOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.cover} alt="" loading="lazy" decoding="async" onError={() => setImgOk(false)} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-text-tertiary">
            <Icon icon={p.cover ? ImageNotFound01Icon : CpuIcon} size={20} strokeWidth={1.4} />
          </div>
        )}
        <span className="pointer-events-none absolute right-[12px] top-[12px] inline-flex h-[30px] items-center rounded-[var(--radius-2xl)] bg-[color-mix(in_srgb,var(--color-bg-overlay)_32%,transparent)] px-[12px] text-md font-medium leading-md text-[color:var(--color-white)] backdrop-blur-[40px]">
          Purchased
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col px-[8px]">
        <div className="flex flex-col gap-[16px]">
          <div className="flex flex-col gap-[8px]">
            <h3 className="truncate text-2xl font-semibold leading-2xl text-text-primary">
              <Link
                href={purchasedHref(p.id)}
                title={p.name}
                className="rounded-sm outline-none after:absolute after:inset-0 after:rounded-[var(--radius-2xl)] hover:text-[color:var(--color-text-primary)] focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-border-focus"
              >
                {p.name}
              </Link>
            </h3>
            <p className="m-0 truncate text-lg leading-lg text-text-secondary">
              By {p.creator} · {p.products.length === 1 ? "1 product" : `${p.products.length} products`}
            </p>
            {p.products.length > 1 && <p className="m-0 truncate text-md leading-md text-text-secondary">{p.products.join(" · ")}</p>}
          </div>
          <ul role="list" aria-label="What you own" className="m-0 flex list-none flex-wrap gap-[8px] p-0">
            {cardChipsOf(p).map((c) => (
              <li key={c}>
                <Tag size="md">{c}</Tag>
              </li>
            ))}
          </ul>
          {uses.length > 0 && <p className="m-0 text-md leading-md text-text-secondary">{uses.join(" · ")}</p>}
        </div>

        <div className="mt-auto flex flex-col gap-[8px] pt-[12px]">
          <div aria-hidden className="h-px w-full bg-border opacity-40" />
          <div className="flex items-end justify-between gap-[12px]">
            <div className="flex min-w-0 flex-col">
              <span className="text-lg leading-lg text-text-tertiary">You own</span>
              <span className="text-2xl font-semibold leading-2xl tabular-nums text-text-primary">
                {p.count} {p.count === 1 ? "NFT" : "NFTs"}
              </span>
            </div>
            <div className="flex min-w-0 flex-col items-end text-right">
              <span className="text-lg leading-lg text-text-tertiary">Last bought</span>
              <span className="truncate font-mono text-md leading-md text-text-primary">{formatDate(p.lastAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
