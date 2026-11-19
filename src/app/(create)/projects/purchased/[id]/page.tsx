// /projects/purchased/[id] — what the active demo creator bought of one project (owner, 2026-11-16: "anything
// bought goes to My projects — how many copies, the permission, everything"; 2026-11-19: planned as the project
// unlocked, plan 6rPKBgwzQ6r6woYmjfE6Td). The id is this browser's project id or a sample's feed id; `?nft=`
// opens the Your NFTs box on that kind, as on the marketplace page. The page reads the stores (purchased-page.tsx).

import type { Metadata } from "next";
import * as React from "react";
import { offerTabOf } from "@/components/marketplace/offer-tab";
import { PurchasedPage } from "@/components/projects/purchased/purchased-page";

// The client sets "{project} · Purchased · IDEEZA" once it knows the name.
export const metadata: Metadata = { title: "Purchased · My projects · IDEEZA" };

export default async function PurchasedRoute({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nft?: string }>;
}) {
  const { id } = await params;
  return <PurchasedPage id={decodeURIComponent(id)} initialTab={offerTabOf((await searchParams).nft)} />;
}
