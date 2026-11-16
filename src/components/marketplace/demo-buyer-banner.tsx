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
// - On a listing's own page (`projectId`) the body ends with "Your project
//   page": the way back to the owner's side lives in this prototype-only
//   banner, never in the buyer's header (owner, 2026-11-15).
// - The grid holds other creators' samples too (sample-market.ts), and a
//   sample's page (`sample`) is theirs, so only a listing's own page says
//   "This listing is yours".

import * as React from "react";
import Link from "next/link";
import { Banner, SelectMenu, type SelectOption } from "@/components/ideeza";
import { DEMO_BUYERS } from "@/lib/wallet/identities";
import type { DemoBuyerId } from "@/lib/wallet/types";
import { useActiveBuyer } from "@/lib/wallet/use-demo-wallet";

/** The banner's one link: back to the person's own page for this project (a listing detail page only). */
const INLINE_LINK =
  "rounded-sm font-medium text-text-brand underline-offset-2 outline-none hover:text-text-brand-hover hover:underline focus-visible:ring-2 focus-visible:ring-border-focus";

const OPTIONS: SelectOption<DemoBuyerId>[] = DEMO_BUYERS.map((b) => ({ value: b.id, label: `${b.name} · demo creator` }));

export function DemoBuyerBanner({ className, projectId, sample }: { className?: string; projectId?: string; sample?: boolean }) {
  const { buyer, setActiveBuyer } = useActiveBuyer();
  return (
    <Banner
      tone="info"
      title={`Testnet demo · shopping as ${buyer.name}`}
      className={className}
      action={
        <SelectMenu<DemoBuyerId>
          label="Shopping as"
          value={buyer.id}
          onChange={setActiveBuyer}
          options={OPTIONS}
          placeholder="Choose a demo creator"
          className="w-[184px] max-md:[&>button]:min-h-[44px] [@media(pointer:coarse)]:[&>button]:min-h-[44px]"
        />
      }
    >
      {projectId
        ? "This listing is yours, so a demo creator does the buying"
        : sample
          ? "Another creator's sample: a demo creator does the buying"
          : "Your listings and other creators' samples: a demo creator does the buying"}{" "}
      — test tokens in a test wallet. Nothing is sent to a blockchain.
      {projectId && (
        <>
          {" "}
          <Link href={`/projects/${projectId}`} className={INLINE_LINK}>
            Your project page
          </Link>
        </>
      )}
    </Banner>
  );
}
