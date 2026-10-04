"use client";

// Cost disclosure and the wallet fact line (P2-MINT-5), shared by the Brief
// form step and LISTING's form.
//
// MintCostRows — what a mint costs now. Sell and Give only; never for Save
// (v1's rule: no money on a save). Lazy: "To pay now · Nothing", the listing
// row (Sell), and who pays the network fee later. Instant: the mint fee, the
// network fee (named for its chain, "test ETH — no real cost"), the listing
// row, a rule, and "Total to pay now" in bold, then the estimate note.
//
// WalletFactLine — the info box beside it: what the wallet will be asked for
// ("You only sign — nothing is charged" / "Nothing is charged until you
// approve in your wallet") and where the wallet stands. A fact, not a
// control: connecting, switching and paying happen in the request dialog.
// The balance and the can't-afford warning are read from the wallet AND the
// marketplace (errata 29), so a seller's payouts count.
//
// Both carry TestnetDemoBadge: every demo money surface does.

import * as React from "react";
import { TestnetDemoBadge } from "@/components/ideeza";
import type { Intent, Network } from "@/lib/brief/types";
import { useMarket } from "@/lib/market/market-store";
import { mintCostRows } from "@/lib/wallet/mint";
import { mintShortfallOf, walletFactLineOf, type MintShortfall } from "@/lib/wallet/request-view";
import type { MintType } from "@/lib/wallet/types";
import { useDemoWallet } from "@/lib/wallet/use-demo-wallet";
import { cn } from "@/lib/utils";
import { useWalletClock } from "./wallet-dialog";

const ESTIMATE_NOTE =
  "Estimate at fixed reference rates — live network pricing isn't wired yet. IDZ is IDEEZA's token, paid from your wallet; it is separate from the credits a build uses.";
const GIVE_LAZY_NOTE = "The first time someone takes it, their claim pays the network fee.";
const COPY_NOTE = "Minting records that you made this first — it does not stop someone copying the design.";

export function MintCostRows({
  type,
  network,
  intent,
  listing,
  className,
}: {
  type: MintType;
  network: Network;
  intent: Intent;
  /** Sell only: "Listing (Buy now)" and its amount, e.g. "0.5 ETH". */
  listing?: { label: string; amount: string };
  className?: string;
}) {
  if (intent === "save") return null;
  const rows = mintCostRows(type, network, intent === "sell" ? listing : undefined);
  return (
    <div className={cn("flex flex-col gap-[8px] rounded-lg bg-bg-surface-raised p-[16px]", className)}>
      <div className="flex items-center justify-between gap-[8px]">
        <span className="text-2xs font-bold uppercase tracking-caps text-text-tertiary">Cost</span>
        <TestnetDemoBadge />
      </div>
      {rows.map((r, i) => {
        if (!r.label && r.note) {
          const note = intent === "give" && type === "lazy" ? GIVE_LAZY_NOTE : r.note;
          return (
            <p key={`note-${i}`} className="text-xs leading-relaxed text-text-tertiary">
              {note}
            </p>
          );
        }
        return (
          <React.Fragment key={`${r.label}-${i}`}>
            {/* `--color-border-subtle` is this card's own ground in light
                theme, so the rule steps off it. */}
            {r.bold && <div aria-hidden className="my-[4px] h-[1px] bg-[var(--color-border-strong)]" />}
            <div
              className={cn(
                "flex flex-wrap justify-between gap-x-[12px]",
                r.bold ? "text-md font-bold text-text-primary" : "text-sm font-medium text-text-secondary",
              )}
            >
              <span>{r.label}</span>
              <span className="tabular-nums">
                {r.value}
                {r.note && <span className="font-regular text-text-tertiary"> {r.note}</span>}
              </span>
            </div>
          </React.Fragment>
        );
      })}
      {type === "instant" && <p className="text-xs leading-relaxed text-text-tertiary">{ESTIMATE_NOTE}</p>}
    </div>
  );
}

/**
 * Whether the maker's current account can pay an instant mint on `network`
 * right now (null: it can, it's lazy, or the wallet isn't read yet). The
 * Brief's firstMissing takes `missing`; a CTA takes it as its description.
 */
export function useMintShortfall(type: MintType, network: Network): MintShortfall | null {
  const wallet = useDemoWallet();
  const { data: market } = useMarket();
  const now = useWalletClock();
  return mintShortfallOf(wallet, type, network, { market, now });
}

export function WalletFactLine({
  type,
  network,
  id,
  className,
}: {
  type: MintType;
  network: Network;
  /** For a CTA's aria-describedby. */
  id?: string;
  className?: string;
}) {
  const wallet = useDemoWallet();
  const { data: market } = useMarket();
  const now = useWalletClock();
  const fact = walletFactLineOf(wallet, { type, network }, { market, now });
  const warning = fact.tone === "warning";
  return (
    <div
      id={id}
      className={cn(
        "flex flex-col gap-[4px] rounded-lg border border-solid px-[14px] py-[12px]",
        warning
          ? "border-[var(--color-border-warning)] bg-bg-warning-subtle"
          : "border-[var(--color-border-blue)] bg-bg-info-subtle",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-[8px]">
        <span className="text-md font-semibold text-text-primary">{fact.heading}</span>
        <TestnetDemoBadge />
      </div>
      {!wallet ? (
        // Not read yet: a reserved line, never a flash of "No wallet connected" (P2-MINT-1).
        <span aria-hidden className="block h-[20px] w-3/4 rounded-md bg-bg-subtle" />
      ) : (
        <p className={cn("text-sm leading-relaxed", warning ? "font-medium text-text-primary" : "text-text-secondary")}>
          {fact.line}
        </p>
      )}
      <p className="text-sm leading-relaxed text-text-secondary">{COPY_NOTE}</p>
    </div>
  );
}
