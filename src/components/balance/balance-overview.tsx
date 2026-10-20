"use client";

// Balance › Overview (Figma User Panel V2 41571:126260; spec
// 2026-10-19-balance-overview-design.md): the IDZ balance of the connected
// demo account, and every IDZ movement. It sits in the V2 sheet with the
// breadcrumb on its first line, as Plan & pricing does.
//
// The card is the one every Balance page shares (balance-card.tsx). Buy
// Ideeza Coin opens the presale on Balance › Buy IDZ Token; Stake is the next
// step of this feature and says so; Import opens the token's details. When a
// presale purchase has unlocked, one line under the card says so and leads to
// its Claim (N2).

import * as React from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { MoneyBag01Icon, ShoppingBasket02Icon, Upload01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { PricingFrame } from "@/components/credits/pricing-frame";
import { buttonVariants, linkVariants } from "@/components/ideeza";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import type { Network } from "@/lib/brief/types";
import { CREDITS_HREF } from "@/lib/create/credit-pricing";
import { useMarket } from "@/lib/market/market-store";
import { makerId } from "@/lib/wallet/demo-wallet";
import { idzHoldingsOf, idzLedgerOf } from "@/lib/wallet/idz";
import { compareAmounts, formatAmount } from "@/lib/wallet/money";
import { BUY_IDZ_HREF, BUY_IDZ_NOW_HREF } from "@/lib/wallet/presale";
import { useDemoWallet } from "@/lib/wallet/use-demo-wallet";
import { BalanceCard, BalanceCardSkeleton, ConnectEmptyState, NotConnectedCard } from "./balance-card";
import { IdzActivity } from "./idz-activity";
import { ImportTokenDialog } from "./import-token-dialog";
import { TipButton } from "./tip-button";
import { useSecondClock } from "./use-second-clock";

const SOON = "Opens in the next step of Balance.";

export function BalanceOverview() {
  const wallet = useDemoWallet();
  const { data: market } = useMarket();
  const now = useSecondClock();
  const router = useRouter();
  const { openManage } = useWalletRequest();
  const [importing, setImporting] = React.useState(false);

  const id = wallet ? makerId(wallet.account) : null;
  const state = wallet && id ? wallet.identities[id] : undefined;
  const connected = !!state?.connected;
  const network: Network = state?.network ?? "baseSepolia";
  const holdings = wallet && id && connected ? idzHoldingsOf(wallet, id, { wallet, market, now }) : null;

  const actions = (
    <div className="flex items-center gap-[6px]">
      <TipButton label="Buy Ideeza Coin" icon={<Icon icon={ShoppingBasket02Icon} size={20} />} onPress={() => router.push(BUY_IDZ_NOW_HREF)} />
      <TipButton label="Stake" soon={SOON} icon={<Icon icon={MoneyBag01Icon} size={20} />} />
      <TipButton
        label="Import IDZ token into Wallet"
        icon={<Icon icon={Upload01Icon} size={20} />}
        onPress={() => setImporting(true)}
      />
    </div>
  );

  return (
    <PricingFrame crumbs={[{ label: "Balance" }, { label: "Overview" }]}>
      <h1 className="sr-only">Balance</h1>
      <div className="flex flex-col gap-[24px]">
        {!wallet ? (
          <BalanceCardSkeleton />
        ) : holdings ? (
          <BalanceCard network={network} holdings={holdings} actions={actions} />
        ) : (
          <NotConnectedCard actions={actions} onConnect={openManage} />
        )}

        {holdings && compareAmounts(holdings.claimable, "0") > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-[12px] rounded-xl border border-solid border-border-brand bg-bg-brand-subtle px-[16px] py-[12px]">
            <p className="text-md font-medium leading-md text-text-primary">
              {formatAmount(holdings.claimable, "IDZ")} from the presale is ready to claim.
            </p>
            <NextLink href={BUY_IDZ_HREF} className={buttonVariants({ hierarchy: "primary", size: "md" })}>
              Go to claim
            </NextLink>
          </div>
        )}

        <AboutIdz />

        {!wallet ? null : connected && id ? <IdzActivity rows={idzLedgerOf(wallet, id)} now={now} /> : <ConnectEmptyState onConnect={openManage} />}
      </div>
      <ImportTokenDialog open={importing} network={network} onClose={() => setImporting(false)} />
    </PricingFrame>
  );
}

/** N3 + N4: what IDZ is next to credits, and where sale money lives. */
function AboutIdz() {
  const link = linkVariants({ color: "brand", size: "lg" });
  return (
    <div className="flex flex-col gap-[4px] text-md leading-md text-text-secondary">
      <p className="max-w-[62ch]">
        IDZ is IDEEZA&apos;s own coin. It pays an instant mint&apos;s fee and can pay for AI credits; your credits are a
        separate balance. <NextLink href={CREDITS_HREF} className={link}>Buy credits with IDZ</NextLink>
      </p>
      <p className="max-w-[62ch]">
        Money from selling your projects is on each project&apos;s Earn › Money.{" "}
        <NextLink href="/projects" className={link}>My projects</NextLink>
      </p>
    </div>
  );
}
