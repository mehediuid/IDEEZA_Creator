"use client";

// A product a bought copy covers, with the pieces its kind opens (CL-035 › Your products).
import { use } from "react";
import { PurchasedProductScreen } from "@/components/mobile/purchased/product-screen";
import { kindParamOf, segmentOf } from "@/components/mobile/purchased/paths";

export default function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; productId: string }>;
  searchParams: Promise<{ nft?: string | string[] }>;
}) {
  const { id, productId } = use(params);
  const { nft } = use(searchParams);
  return <PurchasedProductScreen id={segmentOf(id)} productId={segmentOf(productId)} kind={kindParamOf(Array.isArray(nft) ? nft[0] : nft)} />;
}
