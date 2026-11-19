"use client";

// A bought copy's terms for selling it on: the creator's royalty on it (a sample's, or this browser's own listing's)
// and what the creator asks for a new copy of the same kind and use now, the price a holder weighs theirs against.

import * as React from "react";
import { useProjectsEditions } from "@/lib/market/editions-store";
import { ownTrackIdOf, type PurchaseCopy, type PurchaseLine, type PurchasedProject } from "@/lib/market/purchases";
import { copyUseBlockOf, copyUsesOf, SAMPLE_ROYALTIES_PCT, sampleMarketOf } from "@/lib/market/sample-market";
import type { Resale } from "@/lib/market/resales";
import type { SampleSale } from "@/lib/market/phone-sample-sales";
import type { Token } from "@/lib/brief/types";
import type { Amount } from "@/lib/wallet/types";

/** Royalty when this browser's listing doesn't say one. */
const FALLBACK_ROYALTY = 10;

export type CreatorPrice = { amount: Amount; token: Token; open: boolean } | null;

export type ResaleTerms = {
  royaltyOf: (line: PurchaseLine, copy: PurchaseCopy) => number;
  creatorPriceOf: (line: PurchaseLine, copy: PurchaseCopy) => CreatorPrice;
};

export function useResaleTerms(p: Pick<PurchasedProject, "id" | "source">, sampleSales: readonly SampleSale[]): ResaleTerms {
  const editions = useProjectsEditions(p.source === "own" ? [p.id] : []);
  return React.useMemo<ResaleTerms>(() => {
    if (p.source === "sample") {
      const m = sampleMarketOf(p.id);
      return {
        royaltyOf: () => SAMPLE_ROYALTIES_PCT,
        creatorPriceOf: (line) => {
          const o = m && line.kind !== "main" ? copyUsesOf(m, line.kind).find((x) => x.use === line.use) : undefined;
          return o && m ? { amount: o.price, token: o.token, open: copyUseBlockOf(o, m.feedId, sampleSales) === null } : null;
        },
      };
    }
    const trackOf = (copy: PurchaseCopy) => editions.record.find((t) => t.id === ownTrackIdOf(copy.key, p.id));
    return {
      royaltyOf: (_line, copy) => trackOf(copy)?.listing?.royaltyPct ?? FALLBACK_ROYALTY,
      creatorPriceOf: (_line, copy) => {
        const t = trackOf(copy);
        return t?.listing ? { amount: t.listing.regular, token: t.listing.token, open: true } : null;
      },
    };
  }, [p.id, p.source, editions.record, sampleSales]);
}

/** The lowest price other holders ask for this kind and use now, beside the holder's own. */
export function lowestHolderPriceOf(resales: readonly Resale[], projectId: string, line: PurchaseLine, except: string): { amount: Amount; token: Token } | null {
  const open = resales.filter((r) => r.projectId === projectId && r.kind === line.kind && r.use === line.use && r.status === "listed" && r.copyKey !== except);
  const low = open.sort((a, b) => Number(a.price) - Number(b.price))[0];
  return low ? { amount: low.price, token: low.token } : null;
}
