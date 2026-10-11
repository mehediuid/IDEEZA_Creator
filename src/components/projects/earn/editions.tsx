"use client";

// Earn › Editions: one row per product, each with that product's Editions
// block (editions/edition-block.tsx, the product page's rail block, moved
// unchanged): Physical and Virtual NFTs, Create, Add to marketplace, Edit,
// Remove listing and Add NFTs. Its props are built as the product page
// builds its ProductSlotProps. The block reads `view` and asks
// `can(viewer, "editions.manage", view.canCtx)` itself, so its Draft, Given
// and sold-in-full gates are the ones it always had.
//
// Each row is a region named by its product and addressed `#editions-<id>`,
// so the Marketplace block's Physical and Virtual summaries can link to it.

import * as React from "react";
import { PackageIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { StateCard } from "@/components/ideeza";
import { editionProductsOf } from "@/lib/manual/earn-view";
import { productVersionView, type ProductVersionView } from "@/lib/manual/product-page";
import { displayProductName } from "@/lib/manual/products-tab-view";
import type { ProjectProduct } from "@/lib/manual/project-read";
import { EditionBlock } from "../editions/edition-block";
import type { SlotProps } from "../details/slots";
import { EARN_SURFACE } from "./surface";

/** A product no build stands behind has no version: the product page's own empty view. */
const NO_VERSION: ProductVersionView = {
  options: [],
  latest: 0,
  home: 0,
  shown: 0,
  build: { buildId: "", job: null },
  productId: null,
  notice: null,
};

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
    <div className="flex flex-col gap-16">
      {products.map((product) => (
        <EditionsRow key={product.id} {...{ project, view, viewer, now, announce, product }} />
      ))}
    </div>
  );
}

function EditionsRow({ product, ...rest }: Omit<SlotProps, "brief"> & { product: ProjectProduct }) {
  const headingId = React.useId();
  const version = React.useMemo(
    () => productVersionView(product, rest.view.versions, null) ?? NO_VERSION,
    [product, rest.view.versions],
  );
  return (
    <section id={`editions-${product.id}`} aria-labelledby={headingId} className="flex scroll-mt-10 flex-col gap-6">
      <h2 id={headingId} className="m-0 break-words text-lg font-bold text-text-primary">
        {displayProductName(product.name)}
      </h2>
      <div className={EARN_SURFACE}>
        <EditionBlock {...rest} product={product} version={version} />
      </div>
    </section>
  );
}
