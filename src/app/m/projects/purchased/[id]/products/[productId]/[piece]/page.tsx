"use client";

// One piece a bought copy opens, view only, with its file (CL-035 › Your products).
import { use } from "react";
import { PurchasedPieceScreen } from "@/components/mobile/purchased/product-screen";
import { kindParamOf, segmentOf } from "@/components/mobile/purchased/paths";

export default function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; productId: string; piece: string }>;
  searchParams: Promise<{ nft?: string | string[] }>;
}) {
  const { id, productId, piece } = use(params);
  const { nft } = use(searchParams);
  return (
    <PurchasedPieceScreen id={segmentOf(id)} productId={segmentOf(productId)} piece={segmentOf(piece)} kind={kindParamOf(Array.isArray(nft) ? nft[0] : nft)} />
  );
}
