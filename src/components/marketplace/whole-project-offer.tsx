"use client";

// A product page on Explore marketplace whose product has no copies of its own
// on sale (owner, 2026-11-15): the buyer still needs the way to buy. The rail
// says the product comes with its project, lists what the project has on sale
// — the Main NFT and every listed copy, the Innovations post's own sale rows
// (`listingOf`, mine-post.ts) — and leads to the project's buy box. A product
// with its own listed copies shows those instead (EditionBlock); a project
// sold in full, or with nothing on sale, shows nothing here.

import * as React from "react";
import Link from "next/link";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { buttonVariants } from "@/components/ideeza";
import { RailBlock } from "@/components/projects/details/rail-block";
import type { ProductSlotProps } from "@/components/projects/product/product-slots";
import { listingOf } from "@/lib/innovations/mine-post";
import { displayProductName } from "@/lib/manual/products-tab-view";
import { auctionStateOf } from "@/lib/market/auction";
import { tracksOf } from "@/lib/market/editions";
import { formatAmount } from "@/lib/wallet/money";
import { cn } from "@/lib/utils";

export function WholeProjectOffer({ project, view, product, viewer, now }: ProductSlotProps) {
  if (viewer.kind !== "demo-buyer" || view.lock !== null) return null;
  const ownCopies = tracksOf(product.id, view.editions).some((t) => t.listing !== null);
  if (ownCopies) return null;
  const rows = [...(listingOf(project, view)?.rows ?? [])];
  // A running auction reads as the project page's buy box does: the bid that leads, else the starting bid.
  const main = view.listing.kind === "live" && view.listing.listing.type === "auction" ? view.listing.listing : null;
  if (main && rows[0]) {
    const top = auctionStateOf(main, view.bids, now).top;
    rows[0] = {
      label: rows[0].label,
      price: `${top ? "Current bid" : "Starting bid"} ${formatAmount(top?.amount ?? main.minBid ?? "0", main.token)}`,
    };
  }
  if (rows.length === 0) return null;
  const name = displayProductName(product.name);
  return (
    <RailBlock title="Marketplace" meta="Sold with the project" collapsible={false}>
      <div className="flex flex-col gap-6">
        <p className="m-0 text-md text-text-secondary">
          {name} isn&apos;t sold on its own. It comes with {project.name}:
        </p>
        <ul role="list" className="m-0 flex list-none flex-col gap-3 p-0">
          {rows.map((r) => (
            <li key={r.label} className="flex items-baseline justify-between gap-4 text-md">
              <span className="min-w-0 text-text-primary">{r.label}</span>
              <span className="shrink-0 font-semibold tabular-nums text-text-primary">{r.price}</span>
            </li>
          ))}
        </ul>
        <Link
          href={`/marketplace/${project.id}`}
          className={cn(
            buttonVariants({ hierarchy: "primary", size: "lg" }),
            "h-[44px] w-full gap-2 hover:text-[color:var(--color-button-primary-text)]",
          )}
        >
          See {project.name}&apos;s offers
          <Icon icon={ArrowRight01Icon} size={16} />
        </Link>
      </div>
    </RailBlock>
  );
}
