// /projects/[id]/earn/mint — the mint flow (the Brief, Build and Earn P1-2), opened from
// Earn › Project NFT. A static segment, so it wins over `earn/[section]`. Thin server
// wrapper: the project and its draft are read from this browser's stores inside MintPage,
// which shows its own loading, not-found and already-minted states.

import type { Metadata } from "next";
import * as React from "react";
import { MintPage } from "@/components/brief/mint-page";

// Before the store is read the page can't know the project's name; the client sets
// "Mint · {project} · IDEEZA" once it does.
export const metadata: Metadata = { title: "Mint · IDEEZA" };

export default async function ProjectMintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MintPage id={id} />;
}
