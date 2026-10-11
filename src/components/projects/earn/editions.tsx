"use client";

// Earn › Editions: one row per product, each with two plain entry cards
// (Build and Earn P1-3): "Sell the design" (Virtual NFT) and "Sell the
// product" (Physical NFT), each opening its guided flow
// (sell/sell-entry-card.tsx). Under each card are that kind's existing edition
// rows (editions/edition-block.tsx's `EditionTracks`): Add to marketplace,
// Edit, Remove listing and Add NFTs. The card and the rows read `view` and ask
// `can(viewer, "editions.manage", view.canCtx)` themselves, so the Draft,
// Given and sold-in-full gates are the ones the block always had.
//
// The Testnet demo line heads the section, once for every product.
//
// Each row is a region named by its product and addressed `#editions-<id>`,
// so the Marketplace block's Physical and Virtual summaries can link to it.

import * as React from "react";
import { PackageIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { StateCard } from "@/components/ideeza";
import { editionProductsOf } from "@/lib/manual/earn-view";
import { displayProductName } from "@/lib/manual/products-tab-view";
import type { ProjectProduct } from "@/lib/manual/project-read";
import { FLOW_KIND, SELL_FLOWS } from "@/lib/market/sell-flow";
import { DemoLine } from "../editions/create-dialog";
import { EditionTracks } from "../editions/edition-block";
import type { SlotProps } from "../details/slots";
import { SellEntryCard } from "./sell/sell-entry-card";

export function EarnEditions({ project, view, viewer, now, announce }: SlotProps) {
  const products = editionProductsOf(view.products, view.editions);
  if (products.length === 0) {
    return (
      <StateCard
        tone="empty"
        icon={<Icon icon={PackageIcon} size={32} />}
        title="No products yet"
        body="Editions are sold per product. Add a product to the project first."
        className="mx-auto"
      />
    );
  }
  return (
    <div className="flex max-w-[720px] flex-col gap-16">
      <DemoLine />
      {products.map((product) => (
        <EditionsRow key={product.id} {...{ project, view, viewer, now, announce, product }} />
      ))}
    </div>
  );
}

function EditionsRow({ product, ...rest }: Omit<SlotProps, "brief"> & { product: ProjectProduct }) {
  const headingId = React.useId();
  return (
    <section id={`editions-${product.id}`} aria-labelledby={headingId} className="flex scroll-mt-10 flex-col gap-6">
      <h2 id={headingId} className="m-0 break-words text-lg font-bold text-text-primary">
        {displayProductName(product.name)}
      </h2>
      <div className="grid grid-cols-1 items-start gap-10 [@container(min-width:640px)]:grid-cols-2 [@container(min-width:640px)]:gap-8">
        {SELL_FLOWS.map((flow) => (
          <SellEntryCard key={flow} flow={flow} product={product} {...rest}>
            <EditionTracks kind={FLOW_KIND[flow]} product={product} {...rest} />
          </SellEntryCard>
        ))}
      </div>
    </section>
  );
}
