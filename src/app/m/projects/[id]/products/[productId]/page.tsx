"use client";

// One product (Product Details · 2026 update, 10–10f, 10h, 10n, 10t–10z, 23d,
// 31a–32b): `?tab=` picks the tab, `?v=` the version (the owner's), `?view=`
// who is looking (buyer, contributor, market).
import { use } from "react";
import { ProductScreen } from "@/components/mobile/product/product-screen";

export default function Page({ params }: { params: Promise<{ id: string; productId: string }> }) {
  const { id, productId } = use(params);
  return <ProductScreen id={decodeURIComponent(id)} productId={decodeURIComponent(productId)} />;
}
