"use client";

// A product's Sales (CL-015): who bought its Physical and Virtual copies, the
// owner's only, from the product page's Sales row.
import { use } from "react";
import { ProductSalesScreen } from "@/components/mobile/product/sales";

export default function Page({ params }: { params: Promise<{ id: string; productId: string }> }) {
  const { id, productId } = use(params);
  return <ProductSalesScreen id={decodeURIComponent(id)} productId={decodeURIComponent(productId)} />;
}
