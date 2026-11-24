"use client";

// "You own n NFTs › See what you own" (CL-035, the web's see-what-you-own.tsx) on the phone's shop
// screens, in place of the stacked "Your purchase" receipt cards: one row with what the active demo
// creator holds of this project NOW — a copy they sold on is someone else's (lib/market/purchases.ts
// follows the holder), one they bought from a holder is theirs — in the web card's words
// ("Physical NFT ×2 · Virtual NFT ×1 · For sale ×1"). It opens My projects › Purchased › this project,
// or, for a whole project bought, the project itself (CL-038). Every copy sold on: "You sold every
// copy" and the way to what they earned. Nothing bought: no row.

import Link from "next/link";
import { usePurchased } from "@/components/projects/purchased/use-purchased";
import { cardChipsOf, purchaseHrefOf } from "@/lib/market/purchases";
import { cn } from "@/lib/utils";
import { Chevron, LIST_ROW, ListCard } from "../../kit/list";
import { T } from "../../type";
import { purchasedEarnPath } from "./holder-offers";

export function YouOwnRow({ projectId }: { projectId: string }) {
  const { ready, purchases } = usePurchased();
  const p = ready ? purchases.find((x) => x.id === projectId) : undefined;
  if (!p || (p.count === 0 && p.sold.length === 0)) return null;
  const held = p.count > 0;
  const title = held ? `You own ${p.count} ${p.count === 1 ? "NFT" : "NFTs"}` : "You sold every copy";
  const action = held ? "See what you own" : "See what they earned";
  const meta = cardChipsOf(p).join(" · ");
  return (
    <ListCard label="What you own">
      <li>
        <Link href={held ? `/m${purchaseHrefOf(p)}` : purchasedEarnPath(p.id)} aria-label={`${title}. ${action}`} className={LIST_ROW}>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className={cn(T.rowTitle, "break-words")}>{title}</span>
            {meta && <span className={cn(T.meta, "break-words tabular-nums")}>{meta}</span>}
          </span>
          <span className={cn(T.rowTitle, "max-w-[45%] shrink-0 text-right text-text-brand")}>{action}</span>
          <Chevron className="-ml-4" />
        </Link>
      </li>
    </ListCard>
  );
}
