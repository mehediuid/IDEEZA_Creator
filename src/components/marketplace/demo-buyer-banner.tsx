"use client";

// The Testnet demo banner on every Explore marketplace surface (Phase 2 spec
// §2.4, §2.7; P2-MARKETPLACE-2, -3): the grid, the buyer view and its product
// pages. It holds the one home of the demo-buyer switch, "Shopping as".
//
// - Mira, Leo and Sam are `DEMO_BUYERS` (wallet/identities.ts): visibly test
//   identities the person at the keyboard controls, so no activity is made up.
// - The choice is `ideeza:market:buyer` (`useActiveBuyer`), read live, so
//   every surface — the wallet line, holdings, Purchased, "You're the highest
//   bidder" — follows it at once, in this tab and in another.
// - The Banner atom is a polite live region: the new title, "Testnet demo ·
//   shopping as Leo", is what the switch says aloud.

import * as React from "react";
import { Banner, SelectMenu, type SelectOption } from "@/components/ideeza";
import { DEMO_BUYERS } from "@/lib/wallet/identities";
import type { DemoBuyerId } from "@/lib/wallet/types";
import { useActiveBuyer } from "@/lib/wallet/use-demo-wallet";
import { cn } from "@/lib/utils";

const OPTIONS: SelectOption<DemoBuyerId>[] = DEMO_BUYERS.map((b) => ({ value: b.id, label: `${b.name} · demo buyer` }));

export function DemoBuyerBanner({ className }: { className?: string }) {
  const { buyer, setActiveBuyer } = useActiveBuyer();
  return (
    <Banner
      tone="info"
      title={`Testnet demo · shopping as ${buyer.name}`}
      // Below ~480 px the switch wraps under the words rather than squeezing them.
      className={cn("flex-wrap [&>span:first-of-type]:min-w-[min(100%,240px)]", className)}
      action={
        <SelectMenu<DemoBuyerId>
          label="Shopping as"
          value={buyer.id}
          onChange={setActiveBuyer}
          options={OPTIONS}
          placeholder="Choose a demo buyer"
          className="w-[184px] max-md:[&>button]:min-h-[44px] [@media(pointer:coarse)]:[&>button]:min-h-[44px]"
        />
      }
    >
      Every listing here is yours, so a demo buyer does the buying — test tokens in a test wallet. Nothing is sent to a
      blockchain.
    </Banner>
  );
}
