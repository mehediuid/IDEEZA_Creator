"use client";

// One piece, view only (10g, 10i–10m, 10o, 10ya, 30a–30d, 33a–33c).
import { use } from "react";
import { PieceScreen } from "@/components/mobile/product/piece-screen";

export default function Page({ params }: { params: Promise<{ id: string; productId: string; piece: string }> }) {
  const { id, productId, piece } = use(params);
  return <PieceScreen id={decodeURIComponent(id)} productId={decodeURIComponent(productId)} piece={piece} />;
}
