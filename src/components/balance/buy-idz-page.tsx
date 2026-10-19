"use client";

// Balance › Buy IDZ Token (Figma User Panel V2 41571:113537; spec
// 2026-10-19-balance-buy-idz-design.md): the balance card with Import IDZ
// Token and Buy IDZ Token, and every presale purchase of the connected demo
// account with its claim. `?buy=1` opens the presale (the Overview's Buy
// icon, the Wallet menu's Buy $IDZ). Not connected (41571:114057): the card
// offers Connect wallet and Buy IDZ Token still opens the presale, which asks
// for the wallet only when it is needed.

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { whenDialogsClose } from "@/components/create/use-dialog-focus";
import { PricingFrame } from "@/components/credits/pricing-frame";
import { Button } from "@/components/ideeza";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import type { Network } from "@/lib/brief/types";
import { useMarket } from "@/lib/market/market-store";
import { makerId, readWallet } from "@/lib/wallet/demo-wallet";
import { idzHoldingsOf } from "@/lib/wallet/idz";
import { claimRequestOf } from "@/lib/wallet/presale";
import { purchasesOf, type Purchase } from "@/lib/wallet/presale-records";
import { useDemoWallet } from "@/lib/wallet/use-demo-wallet";
import { BalanceCard, BalanceCardSkeleton, ConnectEmptyState, NotConnectedCard } from "./balance-card";
import { ImportTokenDialog } from "./import-token-dialog";
import { PresaleDialog } from "./presale-dialog";
import { PURCHASE_LOG_ID, PurchaseTable, type ClaimState } from "./purchase-table";
import { useSecondClock } from "./use-second-clock";

export function BuyIdzPage() {
  const wallet = useDemoWallet();
  const { data: market } = useMarket();
  const now = useSecondClock();
  const { request, openManage } = useWalletRequest();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [importing, setImporting] = React.useState(false);
  const [claim, setClaim] = React.useState<ClaimState>({ claiming: null, note: null });

  const presaleOpen = params.get("buy") === "1";
  const setPresale = (open: boolean) => router.replace(open ? `${pathname}?buy=1` : pathname, { scroll: false });

  const id = wallet ? makerId(wallet.account) : null;
  const state = wallet && id ? wallet.identities[id] : undefined;
  const connected = !!state?.connected;
  const network: Network = state?.network ?? "baseSepolia";
  const holdings = wallet && id && connected ? idzHoldingsOf(wallet, id, { wallet, market, now: now }) : null;

  const buyButton = (
    <Button hierarchy="primary" size="md" className="max-md:min-h-[var(--touch-min)]" onClick={() => setPresale(true)}>
      Buy IDZ Token
    </Button>
  );

  const onClaim = async (p: Purchase) => {
    if (claim.claiming) return;
    setClaim({ claiming: p.id, note: null });
    const result = await request(claimRequestOf(p), {
      // Read fresh at Confirm: another tab may have claimed it already.
      recheck: () => {
        const fresh = purchasesOf(readWallet(), p.identity).find((x) => x.id === p.id);
        if (!fresh) return "This purchase isn't in this wallet any more.";
        if (fresh.claim) return "This purchase was already claimed.";
        if (Date.now() < fresh.buy.unlocksAt) return "It isn't unlocked yet.";
        return null;
      },
    });
    if (result.ok) {
      setClaim({ claiming: null, note: null });
      // The Claim button is now "Claimed": the keyboard lands there once the wallet closes.
      whenDialogsClose(() => {
        const shown = [...document.querySelectorAll<HTMLElement>(`[data-claim="${p.id}"]`)].find((el) => el.offsetParent !== null);
        shown?.focus();
      });
    } else
      setClaim({
        claiming: null,
        note: {
          id: p.id,
          text: result.reason === "rejected" ? "Claim cancelled in the wallet. Nothing was charged." : (result.message ?? "The claim didn't go through. Try again."),
        },
      });
  };

  // To the table once the dialog has closed and handed focus back, so the heading keeps it.
  const viewLog = () => {
    setPresale(false);
    whenDialogsClose(() => {
      const heading = document.getElementById(PURCHASE_LOG_ID);
      heading?.scrollIntoView({ block: "start" });
      heading?.focus();
    });
  };

  return (
    <PricingFrame crumbs={[{ label: "Balance", href: "/balance" }, { label: "Buy IDZ Token" }]}>
      <h1 className="sr-only">Buy IDZ Token</h1>
      <div className="flex flex-col gap-[24px]">
        {!wallet ? (
          <BalanceCardSkeleton />
        ) : holdings ? (
          <BalanceCard
            network={network}
            holdings={holdings}
            label="Current Balance"
            actions={
              <div className="flex flex-wrap items-center gap-[12px]">
                <Button hierarchy="outline-brand" size="md" className="max-md:min-h-[var(--touch-min)]" onClick={() => setImporting(true)}>
                  Import IDZ Token
                </Button>
                {buyButton}
              </div>
            }
          />
        ) : (
          <NotConnectedCard actions={buyButton} onConnect={openManage} />
        )}

        {!wallet ? null : connected && id ? (
          <PurchaseTable purchases={purchasesOf(wallet, id)} now={now} claim={claim} onClaim={onClaim} />
        ) : (
          <ConnectEmptyState onConnect={openManage} />
        )}
      </div>
      <ImportTokenDialog open={importing} network={network} onClose={() => setImporting(false)} />
      <PresaleDialog open={presaleOpen} onClose={() => setPresale(false)} onViewLog={viewLog} />
    </PricingFrame>
  );
}
