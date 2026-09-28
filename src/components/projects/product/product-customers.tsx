"use client";

// The product page's Customers tab (P2-CUSTOMERS-10). The same
// `CustomersPanel` the project page uses, scoped to this product's Physical
// and Virtual editions: Main NFT sales never show here, and — because both
// panels read the same `customersOf` derivation over the same `view.sales`
// — this list can never disagree with the project's own Customers tab
// (v1 PPL-46, PR-4141).
//
// Five columns, not six: an edition carries no share (P2-CUSTOMERS-3),
// so the panel drops Share for a product scope on its own.

import * as React from "react";
import { CustomersPanel } from "../details/customers-tab";
import { customersOf } from "@/lib/manual/customers";
import { displayProductName } from "@/lib/manual/products-tab-view";
import type { ProductSlotProps } from "./product-slots";

export function ProductCustomers({ project, view, product, now, announce }: ProductSlotProps) {
  const scope = React.useMemo(() => ({ kind: "product" as const, productId: product.id }), [product.id]);
  const customers = React.useMemo(() => customersOf(project, view.sales, { scope }), [project, view.sales, scope]);

  return (
    <CustomersPanel
      customers={customers}
      scope={scope}
      projectId={project.id}
      projectName={project.name}
      status={view.summary.status}
      productName={displayProductName(product.name)}
      unreadable={view.marketUnreadable}
      now={now}
      announce={announce}
    />
  );
}
