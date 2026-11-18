"use client";

// The Testnet demo strip on every Explore marketplace surface (Phase 2 spec
// §2.4, §2.7; P2-MARKETPLACE-2, -3): the grid, the buyer view and its product
// pages, a sample's page. It holds the one home of the demo-buyer switch,
// "Shopping as".
//
// One slim line (owner, 2026-11-16: the banner "doesn't look good and wastes a
// lot of space"): the Testnet demo badge, "Shopping as" with the switch, and
// on a listing's own page "Your project page" at the end. The badge and the
// "demo creator" in each name say it is a test; the longer why is read to a
// screen reader only.
//
// - Mira, Leo and Sam are `DEMO_BUYERS` (wallet/identities.ts): visibly test
//   identities the person at the keyboard controls, so no activity is made up.
// - The choice is `ideeza:market:buyer` (`useActiveBuyer`), read live, so
//   every surface — the wallet line, holdings, Purchased, "You're the highest
//   bidder" — follows it at once, in this tab and in another. A polite live
//   region says the new "Shopping as Leo" aloud.
// - The way back to the owner's side lives here, never in the buyer's header
//   (owner, 2026-11-15); only a listing's own page (`projectId`) is "yours".

import * as React from "react";
import Link from "next/link";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { SelectMenu, TestnetDemoBadge, type SelectOption } from "@/components/ideeza";
import { DEMO_BUYERS } from "@/lib/wallet/identities";
import type { DemoBuyerId } from "@/lib/wallet/types";
import { useActiveBuyer } from "@/lib/wallet/use-demo-wallet";
import { cn } from "@/lib/utils";

const LINK =
  "inline-flex min-h-[24px] items-center gap-2 rounded-sm text-md font-medium text-text-brand outline-none hover:text-text-brand-hover hover:underline focus-visible:ring-2 focus-visible:ring-border-focus max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

const OPTIONS: SelectOption<DemoBuyerId>[] = DEMO_BUYERS.map((b) => ({ value: b.id, label: `${b.name} · demo creator` }));

export function DemoBuyerBanner({ className, projectId, sample }: { className?: string; projectId?: string; sample?: boolean }) {
  const { buyer, setActiveBuyer } = useActiveBuyer();
  const why = projectId
    ? "This listing is yours, so a demo creator does the buying"
    : sample
      ? "Another creator's sample: a demo creator does the buying"
      : "Your listings and other creators' samples: a demo creator does the buying";
  return (
    <section
      aria-label="Testnet demo"
      className={cn(
        "flex flex-wrap items-center gap-x-5 gap-y-3 rounded-lg border border-solid border-border bg-bg-subtle px-5 py-2",
        className,
      )}
    >
      <TestnetDemoBadge />
      <span className="sr-only">{why} — test tokens in a test wallet. Nothing is sent to a blockchain.</span>
      <div className="flex items-center gap-4">
        <span aria-hidden className="text-md text-text-secondary">
          Shopping as
        </span>
        <SelectMenu<DemoBuyerId>
          ariaLabel="Shopping as"
          value={buyer.id}
          onChange={setActiveBuyer}
          options={OPTIONS}
          placeholder="Choose a demo creator"
          className="w-[184px] max-md:[&>button]:min-h-[44px] [@media(pointer:coarse)]:[&>button]:min-h-[44px]"
        />
      </div>
      <p aria-live="polite" className="sr-only">
        Shopping as {buyer.name}
      </p>
      {projectId && (
        <Link href={`/projects/${projectId}`} className={cn(LINK, "ml-auto")}>
          Your project page
          <Icon icon={ArrowRight01Icon} size={14} />
        </Link>
      )}
    </section>
  );
}
