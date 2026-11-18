"use client";

// 10r · the product's Activity history (26a–26d).
import { use } from "react";
import { ProductActivityScreen } from "@/components/mobile/product/activity";

export default function Page({ params }: { params: Promise<{ id: string; productId: string }> }) {
  const { id, productId } = use(params);
  return <ProductActivityScreen id={decodeURIComponent(id)} productId={decodeURIComponent(productId)} />;
}
