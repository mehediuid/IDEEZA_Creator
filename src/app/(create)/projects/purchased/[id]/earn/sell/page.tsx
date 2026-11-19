// /projects/purchased/[id]/earn/sell — Earn › Sell for a project the active demo creator bought copies of: the
// board of their copies and the item panel to sell one on, change its price, take it off sale or read its receipt.
// `#copy-<key>` opens that copy (the purchased page's Sell this copy).

import type { Metadata } from "next";
import * as React from "react";
import { PurchasedEarn } from "@/components/projects/purchased/earn/purchased-earn";

export const metadata: Metadata = { title: "Sell · Earn · Purchased · IDEEZA" };

export default async function PurchasedEarnSellRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PurchasedEarn id={decodeURIComponent(id)} section="sell" />;
}
