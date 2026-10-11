"use client";

// The ladder's facts, live: the page's own derivation (`view`) for products,
// readiness and the mint; the Brief draft for the license; the demo wallet and
// the demo identity check from their stores. `ready` is false until both
// stores have hydrated, so a commit point never flashes a missing step that
// is really in place.

import * as React from "react";
import type { StoredDraft } from "@/lib/brief/project-brief";
import { earnFactsOf, type EarnFacts, type EarnFactsInput } from "@/lib/commerce/ladder";
import { useKyc } from "@/lib/commerce/use-commerce";
import type { ProjectView } from "@/lib/manual/project-read";
import { useDemoWallet } from "@/lib/wallet/use-demo-wallet";

export type EarnFactsSource = Omit<EarnFactsInput, "wallet" | "kyc">;

/** The ladder's input from the project page's SlotProps. */
export function earnSourceOf(view: Pick<ProjectView, "products" | "videos" | "mint">, brief: StoredDraft | null): EarnFactsSource {
  return {
    products: view.products,
    sell: view.videos.readiness.sell,
    mint: view.mint,
    license: brief?.state.license ?? null,
  };
}

export function useEarnFacts(source: EarnFactsSource): { facts: EarnFacts; ready: boolean } {
  const wallet = useDemoWallet();
  const kyc = useKyc();
  const facts = React.useMemo(() => earnFactsOf({ ...source, wallet, kyc: kyc ?? null }), [source, wallet, kyc]);
  return { facts, ready: wallet !== undefined && kyc !== undefined };
}
